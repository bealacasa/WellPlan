/**
 * Ruta de vuelta recibida en la URL (?volver=/sesiones/…). Solo se aceptan rutas internas
 * conocidas: nunca otra web ("//evil.com", "https://…"), para evitar redirecciones abiertas.
 */
export function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  return /^\/(sesiones|ejercicios|plan|hoy)(\/[\w-]+)*$/.test(raw) ? raw : null;
}
