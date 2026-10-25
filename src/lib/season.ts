/*
 * Temporadas con un toque especial en la interfaz (colores, decoración y nombres de las
 * recompensas). Cada una dura 15 días, cada año:
 *  · Halloween: del 25 de octubre al 8 de noviembre.
 *  · Magia (escuela de magia: varitas, lechuzas, pociones): del 9 al 23 de noviembre.
 */

export type Season = "halloween" | "magia" | null;

export function seasonOn(date: Date): Season {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 10 && d >= 25) || (m === 11 && d <= 8)) return "halloween";
  if (m === 11 && d >= 9 && d <= 23) return "magia";
  return null;
}

/** Decoración de cada temporada: regalo de las recompensas y cabecera de Hoy. */
export const SEASON_DECOR: Record<
  Exclude<Season, null>,
  { gift: string; hero: [string, string]; tagline: string }
> = {
  halloween: { gift: "🎃", hero: ["🎃", "🦇"], tagline: "Entrenamiento de miedo 👻" },
  magia: { gift: "🦉", hero: ["🪄", "🦉"], tagline: "Entrenamiento mágico ✨" },
};

/** ¿Es justo el 31 de octubre? */
export const isHalloweenNight = (date: Date) => date.getMonth() === 9 && date.getDate() === 31;

/**
 * Marca la temporada en <html data-season="…"> para que index.css cambie los colores. Es un
 * atributo (no un style inline), así que la CSP lo permite.
 */
export function applySeason(date = new Date()): void {
  const season = seasonOn(date);
  if (season) document.documentElement.dataset.season = season;
  else delete document.documentElement.dataset.season;
}
