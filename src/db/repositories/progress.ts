import { useLiveQuery } from "dexie-react-hooks";
import { addDays, localDateKey, startOfWeek } from "@/lib/dates";
import { buildReport, type Report } from "@/lib/report";
import { db } from "../database";
import { isAlive } from "../records";
import type { Exercise, WeightLog } from "../types";

/*
 * Progreso calculado a partir de los registros (un día "entrenado" = cualquier registro ese
 * día). Lo "planificado" usa el plan y el horario ACTUALES: si cambias el plan, las semanas
 * pasadas se comparan con el plan nuevo (no se guarda la historia del plan).
 */

export type DayStatus = { weekday: number; date: string; planned: boolean; trained: boolean };

export type Progress = {
  /** Lunes a domingo de esta semana. */
  week: DayStatus[];
  trainedThisWeek: number;
  /** Días de la semana con algo en el plan o alguna clase marcada con "Voy". */
  plannedPerWeek: number;
  /** Semanas seguidas cumpliendo el plan (la actual cuenta solo si ya se ha cumplido). */
  streak: number;
  /** Días entrenados en las últimas 8 semanas, de la más antigua a la actual. */
  lastWeeks: { start: string; trained: number }[];
  /** Clases hechas este mes, de más a menos. */
  classesThisMonth: { id: string; name: string; count: number }[];
  /** Todas las clases (para apuntar una que no aparece este mes). */
  allClasses: { id: string; name: string }[];
};

const WEEKS = 8;
const MAX_STREAK_WEEKS = 104;

export async function getProgress(today: Date): Promise<Progress> {
  const [logs, exercises, entries, classes] = await Promise.all([
    db.weightLogs.toArray(),
    db.exercises.toArray(),
    db.planEntries.toArray(),
    db.gymClasses.toArray(),
  ]);
  const aliveLogs = logs.filter(isAlive);
  const trainedDates = new Set(aliveLogs.map((l) => l.date));

  const plannedWeekdays = new Set([
    ...entries.filter(isAlive).map((e) => e.weekday),
    ...classes.filter((c) => isAlive(c) && c.attending).map((c) => c.weekday),
  ]);
  const plannedPerWeek = plannedWeekdays.size;

  const monday = startOfWeek(today);
  const daysOfWeek = (start: Date) =>
    Array.from({ length: 7 }, (_, i) => localDateKey(addDays(start, i)));
  const trainedIn = (start: Date) => daysOfWeek(start).filter((d) => trainedDates.has(d)).length;
  // Sin plan, basta con entrenar algún día para que la semana cuente.
  const goal = Math.max(1, plannedPerWeek);

  const week = daysOfWeek(monday).map((date, i) => ({
    weekday: i + 1,
    date,
    planned: plannedWeekdays.has(i + 1),
    trained: trainedDates.has(date),
  }));
  const trainedThisWeek = week.filter((d) => d.trained).length;

  // Racha: la semana actual suma si ya está cumplida; si no, aún no la rompe.
  let streak = trainedThisWeek >= goal ? 1 : 0;
  for (let w = 1; w <= MAX_STREAK_WEEKS; w++) {
    if (trainedIn(addDays(monday, -7 * w)) < goal) break;
    streak++;
  }

  const lastWeeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = addDays(monday, -7 * (WEEKS - 1 - i));
    return { start: localDateKey(start), trained: trainedIn(start) };
  });

  const monthPrefix = localDateKey(today).slice(0, 7); // "YYYY-MM"
  const classNames = new Map(
    exercises.filter((e) => isAlive(e) && e.type === "clase").map((e) => [e.id, e.name]),
  );
  // Días distintos por clase (marcarla dos veces el mismo día cuenta una).
  const days = new Map<string, Set<string>>();
  for (const log of aliveLogs) {
    if (!classNames.has(log.exerciseId) || !log.date.startsWith(monthPrefix)) continue;
    days.set(log.exerciseId, (days.get(log.exerciseId) ?? new Set()).add(log.date));
  }
  const classesThisMonth = [...days]
    .map(([id, dates]) => ({ id, name: classNames.get(id) ?? "", count: dates.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
  const allClasses = [...classNames]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return {
    week,
    trainedThisWeek,
    plannedPerWeek,
    streak,
    lastWeeks,
    classesThisMonth,
    allClasses,
  };
}

export function useProgress(today: Date): Progress | undefined {
  const key = localDateKey(today);
  return useLiveQuery(() => getProgress(today), [key]);
}

/** "3 de 5 días" (o "3 días" si no hay plan). */
export function weekSummary(p: Progress): string {
  return p.plannedPerWeek > 0
    ? `${p.trainedThisWeek} de ${p.plannedPerWeek} días`
    : `${p.trainedThisWeek} ${p.trainedThisWeek === 1 ? "día" : "días"}`;
}

export function streakLabel(streak: number): string {
  return streak === 1 ? "1 semana" : `${streak} semanas`;
}

/** Datos del informe para el fisio de las últimas `weeks` semanas (reactivo). */
export function useReport(today: Date, weeks: number): Report | undefined {
  const key = localDateKey(today);
  return useLiveQuery(async () => {
    const [exercises, logs, entries, classes] = await Promise.all([
      db.exercises.toArray(),
      db.weightLogs.toArray(),
      db.planEntries.toArray(),
      db.gymClasses.toArray(),
    ]);
    return buildReport({ exercises, logs, entries, classes }, today, weeks);
  }, [key, weeks]);
}

export type DayLog = {
  log: WeightLog;
  exercise: Exercise;
};

export type DayDetail = {
  logs: DayLog[];
  /** Sesiones con algún ejercicio hecho ese día: cuántos de cuántos. */
  sessions: { id: string; name: string; done: number; total: number }[];
};

/** Lo hecho un día concreto: registros (con su ejercicio) y sesiones tocadas. */
export function useDayDetail(date: string): DayDetail | undefined {
  return useLiveQuery(async () => {
    const [logs, exercises, sessions] = await Promise.all([
      db.weightLogs.where("date").equals(date).toArray(),
      db.exercises.toArray(),
      db.sessions.toArray(),
    ]);
    const byId = new Map(exercises.filter(isAlive).map((e) => [e.id, e]));
    const dayLogs = logs
      .filter(isAlive)
      .flatMap((log) => {
        const exercise = byId.get(log.exerciseId);
        return exercise ? [{ log, exercise }] : [];
      })
      .sort((a, b) => a.log.createdAt.localeCompare(b.log.createdAt));
    const doneIds = new Set(dayLogs.map((d) => d.exercise.id));
    const touched = sessions
      .filter((s) => isAlive(s) && s.exerciseIds.some((id) => doneIds.has(id)))
      .map((s) => ({
        id: s.id,
        name: s.name,
        done: s.exerciseIds.filter((id) => doneIds.has(id)).length,
        total: s.exerciseIds.length,
      }));
    return { logs: dayLogs, sessions: touched };
  }, [date]);
}

/** Días en que se hizo una clase (o cualquier ejercicio), del más reciente al más antiguo. */
export function useExerciseDays(exerciseId: string | undefined) {
  return useLiveQuery(async () => {
    if (!exerciseId) return null;
    const exercise = await db.exercises.get(exerciseId);
    if (!isAlive(exercise)) return null;
    const logs = (await db.weightLogs.where("exerciseId").equals(exerciseId).toArray())
      .filter(isAlive)
      .sort((a, b) => b.date.localeCompare(a.date));
    return { exercise, logs };
  }, [exerciseId]);
}
