import type { NewRecord, SyncFields } from "./types";

/** Reloj inyectable para los tests. */
export const clock = { now: () => new Date().toISOString() };

/** Crea un registro nuevo con id UUID y marcado como pendiente de sincronizar. */
export function createRecord<T extends SyncFields>(data: NewRecord<T>): T {
  const now = clock.now();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    dirty: 1,
  } as T;
}

/** Cambios de un registro existente: actualiza la fecha y lo marca para subir. */
export function touch<T extends SyncFields>(changes: Partial<NewRecord<T>>): Partial<T> {
  return { ...changes, updatedAt: clock.now(), dirty: 1 } as Partial<T>;
}

/** Borrado lógico: se oculta en la app y el borrado se sincroniza. */
export function tombstone<T extends SyncFields>(): Partial<T> {
  const now = clock.now();
  return { deletedAt: now, updatedAt: now, dirty: 1 } as Partial<T>;
}

/** Filtra los registros borrados lógicamente. */
export const isAlive = <T extends SyncFields>(record: T | undefined): record is T =>
  Boolean(record) && record?.deletedAt === null;
