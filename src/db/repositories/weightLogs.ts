import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { usesKg } from "@/lib/labels";
import { quickLogInput } from "@/lib/progression";
import { weightLogInputSchema, type WeightLogInput } from "@/lib/validation";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { clock, createRecord, isAlive, tombstone, touch } from "../records";
import type { Exercise, WeightLog } from "../types";

/** Más reciente primero (por fecha y, dentro del mismo día, por hora de registro). */
const newestFirst = (a: WeightLog, b: WeightLog) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

function rangeFor(exerciseId: string) {
  return db.weightLogs
    .where("[exerciseId+date]")
    .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey]);
}

export async function listLogs(exerciseId: string): Promise<WeightLog[]> {
  const logs = await rangeFor(exerciseId).toArray();
  return logs.filter(isAlive).sort(newestFirst);
}

export function useLogs(exerciseId: string | undefined): WeightLog[] | undefined {
  return useLiveQuery(async () => (exerciseId ? listLogs(exerciseId) : []), [exerciseId]);
}

/** Último registro de un ejercicio: rellena el formulario con el último peso usado. */
export async function getLastLog(exerciseId: string): Promise<WeightLog | null> {
  return (await listLogs(exerciseId))[0] ?? null;
}

export function useLastLog(exerciseId: string | undefined): WeightLog | null | undefined {
  return useLiveQuery(async () => (exerciseId ? getLastLog(exerciseId) : null), [exerciseId]);
}

export async function addLog(exerciseId: string, input: WeightLogInput): Promise<string> {
  const data = weightLogInputSchema.parse(input);
  const log = createRecord<WeightLog>({ exerciseId, ...data });
  await db.weightLogs.add(log);
  await syncLastKg([exerciseId]);
  notifyLocalChange();
  return log.id;
}

/**
 * Registro de un toque desde Hoy: igual que la última vez (o según el objetivo).
 * Devuelve el id (para poder deshacerlo) o null si hace falta abrir el formulario.
 */
export async function quickLog(exercise: Exercise, date: string): Promise<string | null> {
  const input = quickLogInput(exercise, await getLastLog(exercise.id));
  return input ? addLog(exercise.id, { ...input, date }) : null;
}

/** Desmarca un ejercicio hecho ese día (borra sus registros). Devuelve los ids, para deshacer. */
export async function unmarkDay(exerciseId: string, date: string): Promise<string[]> {
  const logs = (
    await db.weightLogs.where("[exerciseId+date]").equals([exerciseId, date]).toArray()
  ).filter(isAlive);
  await db.transaction("rw", db.weightLogs, async () => {
    for (const log of logs) await db.weightLogs.update(log.id, tombstone<WeightLog>());
  });
  await syncLastKg([exerciseId]);
  notifyLocalChange();
  return logs.map((l) => l.id);
}

/** Recupera registros borrados (para "Deshacer"). */
export async function restoreLogs(ids: string[]): Promise<void> {
  await db.transaction("rw", db.weightLogs, async () => {
    const changes: Partial<WeightLog> = { deletedAt: null, updatedAt: clock.now(), dirty: 1 };
    for (const id of ids) await db.weightLogs.update(id, changes);
  });
  const logs = await db.weightLogs.bulkGet(ids);
  await syncLastKg(logs.flatMap((l) => (l ? [l.exerciseId] : [])));
  notifyLocalChange();
}

export async function deleteLog(id: string): Promise<void> {
  await db.weightLogs.update(id, tombstone<WeightLog>());
  const log = await db.weightLogs.get(id);
  if (log) await syncLastKg([log.exerciseId]);
  notifyLocalChange();
}

/**
 * Máquinas y peso libre: el peso guardado en el ejercicio es el último que has levantado
 * (se ve en su ficha y en la lista, y se usa al registrar). Se llama tras añadir, quitar o
 * recuperar registros; si se borra el último, vuelve al anterior. Sin registros con kilos,
 * se queda el que tuviera.
 */
export async function syncLastKg(exerciseIds: Iterable<string>): Promise<void> {
  for (const id of new Set(exerciseIds)) {
    const exercise = await db.exercises.get(id);
    if (!isAlive(exercise) || !usesKg(exercise.type)) continue;
    const last = (await listLogs(id)).find((l) => l.kg !== null);
    if (last && last.kg !== exercise.targetKg) {
      await db.exercises.update(id, touch<Exercise>({ targetKg: last.kg }));
    }
  }
}

/** Pone al día el peso de todos los ejercicios (al abrir la app, por los datos de antes). */
export async function syncAllLastKg(): Promise<void> {
  const before = await db.exercises.filter((e) => e.dirty === 1).count();
  await syncLastKg((await db.exercises.toArray()).map((e) => e.id));
  const after = await db.exercises.filter((e) => e.dirty === 1).count();
  if (after !== before) notifyLocalChange();
}
