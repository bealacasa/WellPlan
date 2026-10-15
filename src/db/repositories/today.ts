import { useLiveQuery } from "dexie-react-hooks";
import { isoWeekday, localDateKey } from "@/lib/dates";
import { suggestNextKg } from "@/lib/progression";
import { db } from "../database";
import { isAlive } from "../records";
import { hasDayTarget } from "./plan";
import type { Exercise, WeightLog } from "../types";

/**
 * Lo que toca hoy: una sesión (con sus ejercicios en orden), un ejercicio suelto o una
 * clase del horario del gimnasio marcada con "voy".
 */
export type TodayItem = {
  entryId: string;
  kind: "session" | "exercise" | "class";
  /** Nombre de la sesión (en ejercicios sueltos, el del ejercicio). */
  title: string;
  /** Id de la sesión o del ejercicio suelto. */
  targetId: string;
  exercises: Exercise[];
  /** Sesiones: su foto. */
  photoId?: string | null;
  /** Clases: hora de inicio "HH:MM" y detalles (sala, monitor). */
  time?: string;
  detail?: string;
  /** Añadido solo para hoy (se puede quitar sin tocar el plan). */
  extra?: boolean;
};

export type TodayPlan = {
  items: TodayItem[];
  /** Ejercicios con algún registro hoy (= hechos). */
  done: Set<string>;
  /** Último registro de cada ejercicio de hoy (para "igual que la última vez"). */
  lastLogs: Map<string, WeightLog>;
  /** Peso sugerido para subir (sobrecarga progresiva), por ejercicio. */
  suggestions: Map<string, number>;
  /** ¿Hay algo creado? Para guiar al usuario la primera vez. */
  hasExercises: boolean;
  hasSessions: boolean;
  /** Lo que se puede añadir solo para hoy (lo que aún no está en Hoy). */
  addable: { sessions: { id: string; name: string }[]; exercises: { id: string; name: string }[] };
};

/**
 * Lo planificado para hoy (según el día de la semana) y lo ya hecho hoy. Primero las
 * clases del gimnasio, por hora (tienen hora fija); después el plan, en su orden, y al final
 * lo añadido solo para hoy.
 */
export async function getTodayPlan(date: Date): Promise<TodayPlan> {
  const weekday = isoWeekday(date);
  const dateKey = localDateKey(date);
  const [entries, sessions, exercises, logs, classes, extras] = await Promise.all([
    db.planEntries.where("weekday").equals(weekday).toArray(),
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.weightLogs.where("date").equals(localDateKey(date)).toArray(),
    db.gymClasses.where("weekday").equals(weekday).toArray(),
    db.dayExtras.where("date").equals(dateKey).toArray(),
  ]);
  const sessionById = new Map(sessions.filter(isAlive).map((s) => [s.id, s]));
  const exerciseById = new Map(exercises.filter(isAlive).map((e) => [e.id, e]));

  const planned = entries
    .filter(isAlive)
    .sort((a, b) => a.position - b.position)
    .flatMap((entry): TodayItem[] => {
      if (entry.exerciseId) {
        const base = exerciseById.get(entry.exerciseId);
        if (!base) return [];
        // Cardio con objetivo propio ese día: se muestra ese en lugar del del ejercicio.
        const exercise: Exercise =
          base.type === "cardio" && hasDayTarget(entry)
            ? {
                ...base,
                targetDistanceKm: entry.targetDistanceKm,
                durationSec: entry.durationSec,
                intervalRunSec: entry.intervalRunSec,
                intervalWalkSec: entry.intervalWalkSec,
                intervalRounds: entry.intervalRounds,
              }
            : base;
        return [
          {
            entryId: entry.id,
            kind: "exercise",
            title: exercise.name,
            targetId: exercise.id,
            exercises: [exercise],
          },
        ];
      }
      const session = entry.sessionId ? sessionById.get(entry.sessionId) : undefined;
      if (!session) return [];
      return [
        {
          entryId: entry.id,
          kind: "session",
          title: session.name,
          targetId: session.id,
          photoId: session.photoId,
          exercises: session.exerciseIds.flatMap((id) => exerciseById.get(id) ?? []),
        },
      ];
    });

  // Si la clase ya está en el plan de hoy como ejercicio suelto, no se repite.
  const inPlan = new Set(planned.flatMap((item) => item.exercises.map((e) => e.id)));
  const classItems = classes
    .filter((c) => isAlive(c) && c.attending)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .flatMap((c): TodayItem[] => {
      const exercise = c.exerciseId ? exerciseById.get(c.exerciseId) : undefined;
      if (!exercise || inPlan.has(exercise.id)) return [];
      return [
        {
          entryId: c.id,
          kind: "class",
          title: c.name,
          targetId: c.id,
          exercises: [exercise],
          time: c.startTime,
          detail: [`${c.durationMin} min`, c.room, c.instructor].filter(Boolean).join(" · "),
        },
      ];
    });

  // Solo para hoy: no se repite lo que ya está en el plan de hoy.
  const plannedTargets = new Set(planned.map((item) => item.targetId));
  const extraItems = extras
    .filter(isAlive)
    .sort((a, b) => a.position - b.position)
    .flatMap((extra): TodayItem[] => {
      if (extra.exerciseId) {
        const exercise = exerciseById.get(extra.exerciseId);
        if (!exercise || plannedTargets.has(exercise.id)) return [];
        return [
          {
            entryId: extra.id,
            kind: "exercise",
            title: exercise.name,
            targetId: exercise.id,
            exercises: [exercise],
            extra: true,
          },
        ];
      }
      const session = extra.sessionId ? sessionById.get(extra.sessionId) : undefined;
      if (!session || plannedTargets.has(session.id)) return [];
      return [
        {
          entryId: extra.id,
          kind: "session",
          title: session.name,
          targetId: session.id,
          photoId: session.photoId,
          exercises: session.exerciseIds.flatMap((id) => exerciseById.get(id) ?? []),
          extra: true,
        },
      ];
    });

  const items = [...classItems, ...planned, ...extraItems];
  const inToday = new Set(items.map((item) => item.targetId));
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");
  const addable = {
    sessions: [...sessionById.values()]
      .filter((s) => !inToday.has(s.id))
      .map((s) => ({ id: s.id, name: s.name }))
      .sort(byName),
    exercises: [...exerciseById.values()]
      .filter(
        (e) => !inToday.has(e.id) && !items.some((i) => i.exercises.some((x) => x.id === e.id)),
      )
      .map((e) => ({ id: e.id, name: e.name }))
      .sort(byName),
  };
  // Historial de los ejercicios de hoy, del más reciente al más antiguo.
  const ids = [...new Set(items.flatMap((i) => i.exercises.map((e) => e.id)))];
  const history = (await db.weightLogs.where("exerciseId").anyOf(ids).toArray())
    .filter(isAlive)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const lastLogs = new Map<string, WeightLog>();
  const byExercise = new Map<string, WeightLog[]>();
  for (const log of history) {
    if (!lastLogs.has(log.exerciseId)) lastLogs.set(log.exerciseId, log);
    byExercise.set(log.exerciseId, [...(byExercise.get(log.exerciseId) ?? []), log]);
  }
  const suggestions = new Map<string, number>();
  for (const exercise of exerciseById.values()) {
    const next = suggestNextKg(exercise, byExercise.get(exercise.id) ?? []);
    if (next !== null) suggestions.set(exercise.id, next);
  }

  return {
    items,
    lastLogs,
    suggestions,
    done: new Set(logs.filter(isAlive).map((l) => l.exerciseId)),
    hasExercises: exerciseById.size > 0,
    hasSessions: sessionById.size > 0,
    addable,
  };
}

export function useTodayPlan(date: Date): TodayPlan | undefined {
  const key = localDateKey(date);
  return useLiveQuery(() => getTodayPlan(date), [key]);
}
