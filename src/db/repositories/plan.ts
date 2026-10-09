import { useLiveQuery } from "dexie-react-hooks";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { dayTargetSchema, type DayTarget } from "@/lib/validation";
import { createRecord, isAlive, tombstone, touch } from "../records";
import type { PlanEntry } from "../types";

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const MAX_PER_DAY = 20;

/** Plan de la semana: para cada día (1 = lunes … 7 = domingo), sus entradas en orden. */
export type WeekPlan = Record<number, PlanEntry[]>;

/** Lo que se asigna a un día: una sesión o un ejercicio suelto (p. ej. «Yoga»). */
export type PlanTarget = { sessionId: string } | { exerciseId: string };

export async function getWeekPlan(): Promise<WeekPlan> {
  const entries = (await db.planEntries.toArray()).filter(isAlive);
  const plan: WeekPlan = Object.fromEntries(WEEKDAYS.map((d) => [d, []]));
  for (const entry of entries) plan[entry.weekday]?.push(entry);
  for (const day of WEEKDAYS) plan[day]?.sort((a, b) => a.position - b.position);
  return plan;
}

export function useWeekPlan(): WeekPlan | undefined {
  return useLiveQuery(getWeekPlan, []);
}

const sameTarget = (entry: PlanEntry, target: PlanTarget) =>
  "sessionId" in target
    ? entry.sessionId === target.sessionId
    : entry.exerciseId === target.exerciseId;

/** Sin objetivo propio del día: vale el del ejercicio. */
export const NO_DAY_TARGET: DayTarget = {
  targetDistanceKm: null,
  durationSec: null,
  intervalRunSec: null,
  intervalWalkSec: null,
  intervalRounds: null,
};

/** Asigna una sesión o un ejercicio a un día. Devuelve el id de la entrada (o la ya existente). */
export async function addToDay(weekday: number, target: PlanTarget): Promise<string> {
  if (!WEEKDAYS.includes(weekday as (typeof WEEKDAYS)[number])) throw new Error("Día no válido");
  const day = (await getWeekPlan())[weekday] ?? [];
  if (day.length >= MAX_PER_DAY) throw new Error("Demasiadas entradas en un día");
  const existing = day.find((e) => sameTarget(e, target));
  if (existing) return existing.id; // ya asignado ese día
  const position = day.reduce((max, e) => Math.max(max, e.position + 1), 0);
  const entry = createRecord<PlanEntry>({
    weekday,
    sessionId: "sessionId" in target ? target.sessionId : null,
    exerciseId: "exerciseId" in target ? target.exerciseId : null,
    position,
    ...NO_DAY_TARGET,
  });
  await db.planEntries.add(entry);
  notifyLocalChange();
  return entry.id;
}

export function usePlanEntry(id: string | undefined): PlanEntry | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const entry = await db.planEntries.get(id);
    return isAlive(entry) ? entry : null;
  }, [id]);
}

/** Objetivo propio de ese día (p. ej. el martes, CaCo en vez de los 5 km de siempre). */
export async function setDayTarget(entryId: string, target: DayTarget): Promise<void> {
  const data = dayTargetSchema.parse(target);
  await db.planEntries.update(entryId, touch<PlanEntry>(data));
  notifyLocalChange();
}

/** ¿Tiene la entrada un objetivo propio? */
export const hasDayTarget = (entry: DayTarget) =>
  entry.targetDistanceKm !== null || entry.durationSec !== null || entry.intervalRounds !== null;

export async function removeFromDay(entryId: string): Promise<void> {
  await db.planEntries.update(entryId, tombstone<PlanEntry>());
  notifyLocalChange();
}

/** Quita un ejercicio suelto (borrado) de todos los días. Llamar dentro de una transacción. */
export async function removeExerciseFromPlan(exerciseId: string): Promise<void> {
  const entries = await db.planEntries.where("exerciseId").equals(exerciseId).toArray();
  for (const entry of entries.filter(isAlive)) {
    await db.planEntries.update(entry.id, tombstone<PlanEntry>());
  }
}
