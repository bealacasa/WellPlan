import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabase, isCloudConfigured } from "./supabase";

/**
 * Normaliza y valida un email (sin Zod para no cargarlo en la primera pantalla). Supabase
 * vuelve a validarlo en el servidor. Devuelve null si no es válido.
 */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED: AuthResult = { ok: false, error: "La nube aún no está configurada." };

/** Sesión actual de Supabase (null si no hay login o no hay nube). */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isCloudConfigured);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    void getSupabase().then(async (supabase) => {
      if (!supabase || !active) return;
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      const sub = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
      unsubscribe = () => sub.data.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { session, loading };
}

/** Dirección a la que vuelve el enlace del email (debe estar en "Redirect URLs" de Supabase). */
export function loginRedirectUrl(origin = window.location.origin): string {
  return `${origin}${import.meta.env.BASE_URL}`;
}

/**
 * Envía el enlace de acceso por email (plantilla estándar de Supabase). Respuesta genérica:
 * no revela si la cuenta existe.
 */
export async function sendLoginLink(rawEmail: string): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Escribe un email válido." };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: loginRedirectUrl() },
  });
  if (error?.status === 429) {
    return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
  }
  return { ok: true };
}

export async function signInWithPasskey(): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signInWithPasskey();
  return error
    ? { ok: false, error: "No se pudo entrar con la passkey. ¿La creaste ya en Ajustes?" }
    : { ok: true };
}

export async function registerPasskey(): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.registerPasskey();
  return error ? { ok: false, error: "No se pudo guardar la passkey." } : { ok: true };
}

export async function signOut(): Promise<void> {
  // Cierra la sesión en este dispositivo. Los datos locales se conservan.
  await (await getSupabase())?.auth.signOut({ scope: "local" });
}

export const passkeysSupported = () =>
  typeof window !== "undefined" && "PublicKeyCredential" in window;
