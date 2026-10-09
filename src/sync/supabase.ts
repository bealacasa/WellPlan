import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** ¿Hay nube configurada? Si no, la app funciona igual, solo en local. */
export const isCloudConfigured = Boolean(url && key);

let client: Promise<SupabaseClient | null> | null = null;

/**
 * Cliente de Supabase, cargado en diferido: la librería (~55 kB) no bloquea la primera
 * pantalla; se descarga justo después, en segundo plano. La clave publicable es pública
 * por diseño: protegen los datos el login y las políticas RLS de Postgres.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!url || !key) return Promise.resolve(null);
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Primer acceso con el enlace del email: la sesión llega en el fragmento (#) de la URL,
        // que nunca se envía al servidor, y supabase-js lo borra de la barra al leerlo.
        // Flujo "implicit" (no PKCE) para que funcione aunque el enlace se abra en Safari y no
        // en la app instalada (PKCE exige el mismo navegador que pidió el enlace).
        detectSessionInUrl: true,
        flowType: "implicit",
        storageKey: "wellplan-auth",
      },
    }),
  );
  return client;
}
