import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone } from "../records";
import type { DayExtra } from "../types";
import type { PlanTarget } from "./plan";

const MAX_PER_DAY = 50;

/** Lo añadido solo para esa fecha, en orden. */
export async function listExtras(date: string): Promise<DayExtra[]> {
  return (await db.dayExtras.where("date").equals(date).toArray())
    .filter(isAlive)
    .sort((a, b) => a.position - b.position);
}

/** Añade una sesión o un ejercicio solo para esa fecha (no toca el plan semanal). */
export async function addExtra(date: string, target: PlanTarget): Promise<string> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Fecha no válida");
  const day = await listExtras(date);
  const existing = day.find((e) =>
    "sessionId" in target ? e.sessionId === target.sessionId : e.exerciseId === target.exerciseId,
  );
  if (existing) return existing.id;
  if (day.length >= MAX_PER_DAY) throw new Error("Demasiadas cosas en un día");
  const extra = createRecord<DayExtra>({
    date,
    sessionId: "sessionId" in target ? target.sessionId : null,
    exerciseId: "exerciseId" in target ? target.exerciseId : null,
    position: day.reduce((max, e) => Math.max(max, e.position + 1), 0),
  });
  await db.dayExtras.add(extra);
  notifyLocalChange();
  return extra.id;
}

export async function removeExtra(id: string): Promise<void> {
  await db.dayExtras.update(id, tombstone<DayExtra>());
  notifyLocalChange();
}

/** Al borrar una sesión o un ejercicio, quita sus extras. Llamar dentro de una transacción. */
export async function removeExtrasOf(target: PlanTarget): Promise<void> {
  const rows =
    "sessionId" in target
      ? await db.dayExtras.where("sessionId").equals(target.sessionId).toArray()
      : await db.dayExtras.where("exerciseId").equals(target.exerciseId).toArray();
  for (const row of rows.filter(isAlive)) {
    await db.dayExtras.update(row.id, tombstone<DayExtra>());
  }
}
