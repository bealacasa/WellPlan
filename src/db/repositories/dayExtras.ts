import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone } from "../records";
import type { DayExtra, Exercise } from "../types";
import type { PlanTarget } from "./plan";
import { quickLog, restoreLogs, unmarkDay } from "./weightLogs";

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

/** Resultado de apuntar algo hecho que no estaba planificado. */
export type DoneExtra = {
  extraId: string;
  /** Registros creados (para deshacer). */
  logIds: string[];
  /** Ejercicios que no se pueden registrar de un toque (cardio, faltan kilos, había nota…). */
  pending: Exercise[];
};

/**
 * Algo que NO estaba planificado y que ya has hecho ese día: se añade a esa fecha (el plan
 * semanal no cambia) y se registra como hecho igual que la última vez, como el ✓ de Hoy.
 * En una sesión, cada uno de sus ejercicios; lo ya registrado ese día no se repite.
 */
export async function addDoneExtra(date: string, target: PlanTarget): Promise<DoneExtra> {
  const extraId = await addExtra(date, target);
  return { extraId, ...(await logDoneOn(date, target)) };
}

/**
 * Apunta como hecho, en esa fecha (hoy o un día pasado), un ejercicio o una sesión que ya
 * existen, igual que la última vez. En una sesión, cada uno de sus ejercicios; lo ya
 * registrado ese día no se repite. No toca el plan.
 */
export async function logDoneOn(
  date: string,
  target: PlanTarget,
): Promise<{ logIds: string[]; pending: Exercise[] }> {
  const logIds: string[] = [];
  const pending: Exercise[] = [];
  for (const exercise of await exercisesOf(target)) {
    const already = (
      await db.weightLogs.where("[exerciseId+date]").equals([exercise.id, date]).toArray()
    ).some(isAlive);
    if (already) continue;
    const logId = await quickLog(exercise, date);
    if (logId) logIds.push(logId);
    else pending.push(exercise);
  }
  return { logIds, pending };
}

/**
 * Quita de ese día algo añadido y desmarca lo hecho de sus ejercicios (los de `exerciseIds`:
 * los que no están también en otra cosa de hoy). Devuelve los registros quitados, para deshacer.
 */
export async function removeDoneExtra(
  extraId: string,
  date: string,
  exerciseIds: readonly string[],
): Promise<string[]> {
  const logIds: string[] = [];
  for (const id of exerciseIds) logIds.push(...(await unmarkDay(id, date)));
  await removeExtra(extraId);
  return logIds;
}

/** Deshace `removeDoneExtra`: vuelve a añadirlo a ese día y recupera sus registros. */
export async function restoreDoneExtra(
  date: string,
  target: PlanTarget,
  logIds: string[],
): Promise<void> {
  await addExtra(date, target);
  await restoreLogs(logIds);
}

async function exercisesOf(target: PlanTarget): Promise<Exercise[]> {
  if ("exerciseId" in target) {
    const exercise = await db.exercises.get(target.exerciseId);
    return isAlive(exercise) ? [exercise] : [];
  }
  const session = await db.sessions.get(target.sessionId);
  if (!isAlive(session)) return [];
  const all = await db.exercises.bulkGet(session.exerciseIds);
  return all.filter(isAlive);
}
