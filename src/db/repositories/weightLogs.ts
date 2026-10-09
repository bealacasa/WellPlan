import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";
import { weightLogInputSchema, type WeightLogInput } from "@/lib/validation";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone } from "../records";
import type { WeightLog } from "../types";

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
  notifyLocalChange();
  return log.id;
}

export async function deleteLog(id: string): Promise<void> {
  await db.weightLogs.update(id, tombstone<WeightLog>());
  notifyLocalChange();
}
