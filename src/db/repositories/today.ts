import { useLiveQuery } from "dexie-react-hooks";
import { isoWeekday, localDateKey } from "@/lib/dates";
import { db } from "../database";
import { isAlive } from "../records";
import type { Exercise } from "../types";

/** Lo que toca hoy: una sesión (con sus ejercicios en orden) o un ejercicio suelto. */
export type TodayItem = {
  entryId: string;
  kind: "session" | "exercise";
  /** Nombre de la sesión (en ejercicios sueltos, el del ejercicio). */
  title: string;
  /** Id de la sesión o del ejercicio suelto. */
  targetId: string;
  exercises: Exercise[];
};

export type TodayPlan = {
  items: TodayItem[];
  /** Ejercicios con algún registro hoy (= hechos). */
  done: Set<string>;
  /** ¿Hay algo creado? Para guiar al usuario la primera vez. */
  hasExercises: boolean;
  hasSessions: boolean;
};

/** Lo planificado para hoy (según el día de la semana), en orden, y lo ya hecho hoy. */
export async function getTodayPlan(date: Date): Promise<TodayPlan> {
  const [entries, sessions, exercises, logs] = await Promise.all([
    db.planEntries.where("weekday").equals(isoWeekday(date)).toArray(),
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.weightLogs.where("date").equals(localDateKey(date)).toArray(),
  ]);
  const sessionById = new Map(sessions.filter(isAlive).map((s) => [s.id, s]));
  const exerciseById = new Map(exercises.filter(isAlive).map((e) => [e.id, e]));

  const items = entries
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

  return {
    items,
    done: new Set(logs.filter(isAlive).map((l) => l.exerciseId)),
    hasExercises: exerciseById.size > 0,
    hasSessions: sessionById.size > 0,
  };
}

export function useTodayPlan(date: Date): TodayPlan | undefined {
  const key = localDateKey(date);
  return useLiveQuery(() => getTodayPlan(date), [key]);
}
