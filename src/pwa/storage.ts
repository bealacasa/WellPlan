export type PersistState = "persisted" | "denied" | "unsupported";

/**
 * Pide al navegador que no borre los datos de la app. En iPhone, Safari puede borrar
 * datos de webs no instaladas tras días sin uso; instalada en la pantalla de inicio es mucho más estable.
 */
export async function requestPersistence(nav: Navigator = navigator): Promise<PersistState> {
  if (!nav.storage?.persist || !nav.storage.persisted) return "unsupported";
  try {
    if (await nav.storage.persisted()) return "persisted";
    return (await nav.storage.persist()) ? "persisted" : "denied";
  } catch {
    return "denied";
  }
}

/** ¿Está abierta como app instalada (pantalla de inicio) y no en una pestaña del navegador? */
export function isStandalone(win: Window = window): boolean {
  const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || win.matchMedia?.("(display-mode: standalone)").matches === true;
}

export type StorageUsage = { usedMb: number; quotaMb: number } | null;

export async function storageUsage(nav: Navigator = navigator): Promise<StorageUsage> {
  if (!nav.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await nav.storage.estimate();
  return { usedMb: usage / 1_048_576, quotaMb: quota / 1_048_576 };
}
