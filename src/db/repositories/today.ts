import { useLiveQuery } from "dexie-react-hooks";
import { isoWeekday, localDateKey } from "@/lib/dates";
import { db } from "../database";
import { isAlive } from "../records";
import type { Exercise, Session } from "../types";

export type TodaySession = { entryId: string; session: Session; exercises: Exercise[] };
export type TodayPlan = {
  sessions: TodaySession[];
  /** Ejercicios con algún registro hoy (= hechos). */
  done: Set<string>;
  /** ¿Hay algo creado? Para guiar al usuario la primera vez. */
  hasExercises: boolean;
  hasSessions: boolean;
};

/** Sesiones del día (según el plan semanal), con sus ejercicios en orden y lo ya hecho hoy. */
export async function getTodayPlan(date: Date): Promise<TodayPlan> {
  const [entries, sessions, exercises, logs] = await Promise.all([
    db.planEntries.where("weekday").equals(isoWeekday(date)).toArray(),
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.weightLogs.where("date").equals(localDateKey(date)).toArray(),
  ]);
  const sessionById = new Map(sessions.filter(isAlive).map((s) => [s.id, s]));
  const exerciseById = new Map(exercises.filter(isAlive).map((e) => [e.id, e]));

  const today = entries
    .filter(isAlive)
    .sort((a, b) => a.position - b.position)
    .flatMap((entry) => {
      const session = sessionById.get(entry.sessionId);
      if (!session) return [];
      const list = session.exerciseIds.flatMap((id) => exerciseById.get(id) ?? []);
      return [{ entryId: entry.id, session, exercises: list }];
    });

  return {
    sessions: today,
    done: new Set(logs.filter(isAlive).map((l) => l.exerciseId)),
    hasExercises: exerciseById.size > 0,
    hasSessions: sessionById.size > 0,
  };
}

export function useTodayPlan(date: Date): TodayPlan | undefined {
  const key = localDateKey(date);
  return useLiveQuery(() => getTodayPlan(date), [key]);
}
