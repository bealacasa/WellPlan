import { useLiveQuery } from "dexie-react-hooks";
import { isoWeekday, localDateKey } from "@/lib/dates";
import { db } from "../database";
import { isAlive } from "../records";
import type { Exercise } from "../types";

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
  /** Clases: hora de inicio "HH:MM" y detalles (sala, monitor). */
  time?: string;
  detail?: string;
};

export type TodayPlan = {
  items: TodayItem[];
  /** Ejercicios con algún registro hoy (= hechos). */
  done: Set<string>;
  /** ¿Hay algo creado? Para guiar al usuario la primera vez. */
  hasExercises: boolean;
  hasSessions: boolean;
};

/**
 * Lo planificado para hoy (según el día de la semana) y lo ya hecho hoy. Primero las
 * clases del gimnasio, por hora (tienen hora fija); después el plan, en su orden.
 */
export async function getTodayPlan(date: Date): Promise<TodayPlan> {
  const weekday = isoWeekday(date);
  const [entries, sessions, exercises, logs, classes] = await Promise.all([
    db.planEntries.where("weekday").equals(weekday).toArray(),
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.weightLogs.where("date").equals(localDateKey(date)).toArray(),
    db.gymClasses.where("weekday").equals(weekday).toArray(),
  ]);
  const sessionById = new Map(sessions.filter(isAlive).map((s) => [s.id, s]));
  const exerciseById = new Map(exercises.filter(isAlive).map((e) => [e.id, e]));

  const planned = entries
    .filter(isAlive)
    .sort((a, b) => a.position - b.position)
    .flatMap((entry): TodayItem[] => {
      if (entry.exerciseId) {
        const exercise = exerciseById.get(entry.exerciseId);
        if (!exercise) return [];
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

  return {
    items: [...classItems, ...planned],
    done: new Set(logs.filter(isAlive).map((l) => l.exerciseId)),
    hasExercises: exerciseById.size > 0,
    hasSessions: sessionById.size > 0,
  };
}

export function useTodayPlan(date: Date): TodayPlan | undefined {
  const key = localDateKey(date);
  return useLiveQuery(() => getTodayPlan(date), [key]);
}
