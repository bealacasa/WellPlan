import { useState, useTransition } from "react";
import { Card, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import {
  passkeysSupported,
  registerPasskey,
  sendCode,
  signInWithPasskey,
  signOut,
  useSession,
  verifyCode,
  type AuthResult,
} from "./auth";
import { isCloudConfigured } from "./supabase";

/** Cuenta para guardar los datos en la nube: passkey (Face ID) o código por email. */
export function AccountCard() {
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (action: () => Promise<AuthResult>, success?: string) =>
    start(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? success
            ? { ok: true, text: success }
            : null
          : { ok: false, text: result.error },
      );
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
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(registerPasskey, "Passkey guardada. La próxima vez entra con Face ID.")
              }
              className={`${buttonSecondary} w-full`}
            >
              Añadir passkey (Face ID)
            </button>
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
          {!codeSent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const result = await sendCode(email);
                  if (result.ok) setCodeSent(true);
                  return result;
                }, "Si el email es correcto, te hemos enviado un código.");
              }}
              className="space-y-2"
            >
              <label htmlFor="email" className="text-sm font-medium">
                O con un código por email
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
                Enviarme un código
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => verifyCode(email, code));
              }}
              className="space-y-2"
            >
              <label htmlFor="code" className="text-sm font-medium">
                Código de 6 dígitos
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputClass} tracking-[0.4em]`}
              />
              <button type="submit" disabled={pending || !code} className={buttonPrimary}>
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                }}
                className="min-h-11 w-full text-sm font-medium text-muted underline"
              >
                Usar otro email
              </button>
            </form>
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
