import { db as defaultDb, type WellPlanDB } from "./database";

/** Claves conocidas de la tabla meta (ajustes y estado locales que no se sincronizan). */
export type MetaKey =
  | "storageWarningDismissedAt"
  | "lastBackupAt"
  | "lastSyncAt"
  /** Cuenta con la que se sincronizan los datos de este dispositivo. */
  | "syncUserId"
  /** Cursor de descarga por tabla remota (último server_updated_at visto). */
  | `syncCursor:${string}`;

export async function getMeta<T>(key: MetaKey, db: WellPlanDB = defaultDb): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(
  key: MetaKey,
  value: unknown,
  db: WellPlanDB = defaultDb,
): Promise<void> {
  await db.meta.put({ key, value });
}
