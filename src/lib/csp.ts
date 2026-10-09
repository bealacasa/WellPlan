/**
 * Content-Security-Policy de la app. Sin scripts ni estilos inline y sin recursos de
 * terceros: la única conexión externa permitida es tu proyecto de Supabase.
 * (En <meta> no se admiten frame-ancestors ni report-uri; GitHub Pages no deja usar cabeceras.)
 */
export function buildCsp(supabaseUrl?: string): string {
  const supabase = supabaseUrl ? new URL(supabaseUrl).origin : null;
  const connect = ["'self'", ...(supabase ? [supabase] : [])].join(" ");
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    // blob: para las fotos guardadas en IndexedDB.
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}
