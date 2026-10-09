type Listener = () => void;
const listeners = new Set<Listener>();

/** Avisa de que hay cambios locales pendientes (el motor de sync programa una subida). */
export function notifyLocalChange(): void {
  for (const listener of listeners) listener();
}

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
