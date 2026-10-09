import { db } from "./database";

/** Claves conocidas de la tabla meta (ajustes y estado locales que no se sincronizan). */
export type MetaKey = "storageWarningDismissedAt" | "lastBackupAt" | "lastSyncAt";

export async function getMeta<T>(key: MetaKey): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: MetaKey, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}
