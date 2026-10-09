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

export const MAX_KM = 1000;
export const KM_STEP = 0.5;

/** Distancia en km con coma o punto ("5,25"). Devuelve null si no es válida. */
export function parseKm(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value >= 0 && value <= MAX_KM ? value : null;
}

/** 1965 s → "32:45"; 3910 s → "1:05:10". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Ritmo en segundos por km, o null si faltan datos. */
export function paceSecPerKm(distanceKm: number | null, durationSec: number | null): number | null {
  if (!distanceKm || !durationSec || distanceKm <= 0) return null;
  return durationSec / distanceKm;
}

/** "6:33 /km" */
export function formatPace(secPerKm: number): string {
  return `${formatDuration(secPerKm)} /km`;
}
