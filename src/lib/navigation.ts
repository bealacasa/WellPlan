/**
 * Ruta de vuelta recibida en la URL (?volver=/sesiones/…). Solo se aceptan rutas internas
 * conocidas: nunca otra web ("//evil.com", "https://…"), para evitar redirecciones abiertas.
 */
export function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  return /^\/(sesiones|ejercicios|plan|hoy|progreso)(\/[\w-]+)*$/.test(raw) ? raw : null;
}

/** Texto del enlace «← …» para volver a una ruta interna. */
export function backLabel(path: string): string {
  if (path.startsWith("/progreso")) return "Progreso";
  if (path.startsWith("/sesiones")) return "Sesión";
  if (path.startsWith("/plan")) return "Plan";
  if (path.startsWith("/ejercicios")) return "Ejercicios";
  return "Hoy";
}
