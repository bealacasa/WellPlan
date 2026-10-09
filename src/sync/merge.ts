import type { SyncFields } from "@/db/types";

/**
 * ¿Aplicamos la versión que llega de la nube sobre la local?
 * - Si no existe en local, o no tiene cambios pendientes: sí.
 * - Si ambas cambiaron (conflicto): gana la modificación más reciente ("last write wins").
 *   Con un único usuario es la regla más predecible.
 */
export function shouldApplyRemote(local: SyncFields | undefined, remoteUpdatedAt: string): boolean {
  if (!local || local.dirty === 0) return true;
  return Date.parse(remoteUpdatedAt) > Date.parse(local.updatedAt);
}
