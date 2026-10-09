import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Cliente de Supabase, o null si la nube no está configurada (la app funciona igual,
 * solo en local). La clave publicable es pública por diseño: protegen los datos el
 * login y las políticas RLS de Postgres.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Entramos con código o passkey, nunca con tokens en la URL.
          detectSessionInUrl: false,
          storageKey: "wellplan-auth",
        },
      })
    : null;

export const isCloudConfigured = supabase !== null;
