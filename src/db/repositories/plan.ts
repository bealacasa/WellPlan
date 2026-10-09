import { useLiveQuery } from "dexie-react-hooks";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone } from "../records";
import type { PlanEntry } from "../types";

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const MAX_PER_DAY = 20;

/** Plan de la semana: para cada día (1 = lunes … 7 = domingo), sus entradas en orden. */
export type WeekPlan = Record<number, PlanEntry[]>;

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

export async function addToDay(weekday: number, sessionId: string): Promise<void> {
  if (!WEEKDAYS.includes(weekday as (typeof WEEKDAYS)[number])) throw new Error("Día no válido");
  const day = (await getWeekPlan())[weekday] ?? [];
  if (day.length >= MAX_PER_DAY) throw new Error("Demasiadas sesiones en un día");
  if (day.some((e) => e.sessionId === sessionId)) return; // ya asignada ese día
  const position = day.reduce((max, e) => Math.max(max, e.position + 1), 0);
  await db.planEntries.add(createRecord<PlanEntry>({ weekday, sessionId, position }));
  notifyLocalChange();
}

export async function removeFromDay(entryId: string): Promise<void> {
  await db.planEntries.update(entryId, tombstone<PlanEntry>());
  notifyLocalChange();
}
