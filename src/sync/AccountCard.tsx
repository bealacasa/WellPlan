import { useState, useTransition } from "react";
import { Card, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import {
  passkeysSupported,
  registerPasskey,
  sendLoginLink,
  signInWithPasskey,
  signOut,
  useSession,
  type AuthResult,
} from "./auth";
import { isCloudConfigured } from "./supabase";

/**
 * Cuenta para guardar los datos en la nube. Primer acceso con enlace por email (en Safari),
 * después passkey: se guarda en el llavero de iCloud y sirve también en la app instalada.
 */
export function AccountCard() {
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<AuthResult>, success?: string) =>
    start(async () => {
      const result = await action();
      if (!result.ok) setMessage({ ok: false, text: result.error });
      else setMessage(success ? { ok: true, text: success } : null);
    });

  return (
    <Card>
      <h2 className="text-lg font-semibold">Cuenta y copia en la nube</h2>

      {!isCloudConfigured ? (
        <p className="mt-2 text-sm text-muted">
          La nube aún no está configurada. Mientras tanto, todo se guarda solo en este dispositivo.
        </p>
      ) : loading ? (
        <p className="mt-2 text-sm text-muted">Comprobando sesión…</p>
      ) : session ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm">
            Sesión iniciada como <strong className="break-all">{session.user.email}</strong>.
          </p>
          {passkeysSupported() && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    registerPasskey,
                    "Passkey guardada en tu llavero. En la app instalada, entra con «Entrar con passkey».",
                  )
                }
                className={buttonPrimary}
              >
                Crear passkey (Face ID)
              </button>
              <p className="text-xs text-muted">
                Con la passkey entrarás con Face ID, también desde la app instalada en la pantalla
                de inicio.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => start(signOut)}
            className={`${buttonSecondary} w-full`}
          >
            Cerrar sesión en este dispositivo
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-muted">
            Inicia sesión para guardar una copia de tus datos en la nube (servidores en la UE).
          </p>
          {passkeysSupported() && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(signInWithPasskey)}
              className={buttonPrimary}
            >
              Entrar con passkey (Face ID)
            </button>
          )}
          {!linkSent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const result = await sendLoginLink(email);
                  if (result.ok) setLinkSent(true);
                  return result;
                });
              }}
              className="space-y-2"
            >
              <label htmlFor="email" className="text-sm font-medium">
                ¿Primera vez? Te enviamos un enlace de acceso
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email webauthn"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <button
                type="submit"
                disabled={pending || !email}
                className={`${buttonSecondary} w-full`}
              >
                Enviarme el enlace
              </button>
            </form>
          ) : (
            <div role="status" className="space-y-2 rounded-xl bg-accent-soft p-4 text-sm">
              <p className="font-semibold">Revisa tu correo</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Abre el enlace en este iPhone (se abrirá en Safari).</li>
                <li>
                  En Safari, ve a Ajustes de WellPlan y pulsa <strong>Crear passkey</strong>.
                </li>
                <li>
                  Vuelve a la app instalada y pulsa <strong>Entrar con passkey</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setLinkSent(false)}
                className="min-h-11 font-medium underline"
              >
                Usar otro email
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`mt-3 text-sm ${message.ok ? "" : "text-danger"}`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
