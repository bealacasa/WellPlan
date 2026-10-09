import { useLiveQuery } from "dexie-react-hooks";
import { addDays, localDateKey, startOfWeek } from "@/lib/dates";
import { db } from "../database";
import { isAlive } from "../records";

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
  classesThisMonth: { name: string; count: number }[];
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
    const name = classNames.get(log.exerciseId);
    if (!name || !log.date.startsWith(monthPrefix)) continue;
    days.set(name, (days.get(name) ?? new Set()).add(log.date));
  }
  const classesThisMonth = [...days]
    .map(([name, dates]) => ({ name, count: dates.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));

  return { week, trainedThisWeek, plannedPerWeek, streak, lastWeeks, classesThisMonth };
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
