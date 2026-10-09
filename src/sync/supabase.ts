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
          // Primer acceso con el enlace del email: la sesión llega en el fragmento (#) de la URL,
          // que nunca se envía al servidor, y supabase-js lo borra de la barra al leerlo.
          // Flujo "implicit" (no PKCE) para que funcione aunque el enlace se abra en Safari y no
          // en la app instalada (PKCE exige el mismo navegador que pidió el enlace).
          detectSessionInUrl: true,
          flowType: "implicit",
          storageKey: "wellplan-auth",
        },
      })
    : null;

export const isCloudConfigured = supabase !== null;
