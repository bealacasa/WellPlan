/*
 * Temporadas con un toque especial en la interfaz (colores y textos). Por ahora, Halloween:
 * 15 días, del 25 de octubre al 8 de noviembre (ambos incluidos), cada año.
 */

export type Season = "halloween" | null;

export function seasonOn(date: Date): Season {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return (m === 10 && d >= 25) || (m === 11 && d <= 8) ? "halloween" : null;
}

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
