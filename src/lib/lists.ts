/** Mueve el elemento `index` una posición arriba (-1) o abajo (+1). Devuelve una copia. */
export function moveItem<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target] as T, copy[index] as T];
  return copy;
}
