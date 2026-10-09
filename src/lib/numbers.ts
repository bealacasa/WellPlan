export const KG_STEP = 2.5;
export const MAX_KG = 500;

/**
 * Convierte lo que escribe el usuario en kilos. Acepta coma o punto decimal ("22,5", "22.5"),
 * como muestra el teclado de un iPhone en español. Devuelve null si no es un peso válido.
 */
export function parseKg(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value >= 0 && value <= MAX_KG ? value : null;
}

const kgFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

/** 22.5 → "22,5" */
export function formatKg(value: number): string {
  return kgFormat.format(value);
}

/** Suma o resta un paso, sin bajar de 0 ni pasar del máximo, y redondeando a 2 decimales. */
export function stepKg(value: number, delta: number): number {
  const next = Math.round((value + delta) * 100) / 100;
  return Math.min(MAX_KG, Math.max(0, next));
}

/** Acota un entero a [min, max]. */
export function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
