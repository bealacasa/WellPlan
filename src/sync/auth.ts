import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "./supabase";

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,10}$/);

export type AuthResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED: AuthResult = { ok: false, error: "La nube aún no está configurada." };

/** Sesión actual de Supabase (null si no hay login o no hay nube). */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabase !== null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

/** Envía un código de un solo uso. Mensaje genérico: no revela si la cuenta existe. */
export async function sendCode(rawEmail: string): Promise<AuthResult> {
  if (!supabase) return NOT_CONFIGURED;
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return { ok: false, error: "Escribe un email válido." };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: true },
  });
  if (error?.status === 429)
    return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
  return { ok: true };
}

export async function verifyCode(rawEmail: string, rawCode: string): Promise<AuthResult> {
  if (!supabase) return NOT_CONFIGURED;
  const email = emailSchema.safeParse(rawEmail);
  const code = codeSchema.safeParse(rawCode);
  if (!email.success || !code.success)
    return { ok: false, error: "Revisa el código: solo dígitos." };
  const { error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type: "email",
  });
  return error ? { ok: false, error: "Código no válido o caducado." } : { ok: true };
}

export async function signInWithPasskey(): Promise<AuthResult> {
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signInWithPasskey();
  return error ? { ok: false, error: "No se pudo entrar con la passkey." } : { ok: true };
}

export async function registerPasskey(): Promise<AuthResult> {
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.registerPasskey();
  return error ? { ok: false, error: "No se pudo guardar la passkey." } : { ok: true };
}

export async function signOut(): Promise<void> {
  // Cierra la sesión en este dispositivo. Los datos locales se conservan.
  await supabase?.auth.signOut({ scope: "local" });
}

export const passkeysSupported = () =>
  typeof window !== "undefined" && "PublicKeyCredential" in window;
