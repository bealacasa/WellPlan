import { useEffect, useState } from "react";
import { Link } from "react-router";
import { buttonPrimary } from "@/components/ui";
import { passkeysSupported, useSession } from "./auth";
import { getSupabase } from "./supabase";

/**
 * Tras entrar con el enlace del email (en Safari), invita a crear la passkey: es lo que
 * permite entrar después desde la app instalada, que no comparte sesión con Safari.
 */
export function PasskeyNudge() {
  const { session } = useSession();
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session || !passkeysSupported()) return;
    let active = true;
    void getSupabase().then(async (supabase) => {
      const { data } = (await supabase?.auth.passkey.list()) ?? { data: [] };
      if (active) setHasPasskey((data?.length ?? 0) > 0);
    });
    return () => {
      active = false;
    };
  }, [session]);

  if (!session || hasPasskey !== false) return null;

  return (
    <aside className="mb-5 rounded-2xl bg-accent-soft p-4" aria-label="Crear passkey">
      <p className="font-semibold">¡Has entrado! Último paso</p>
      <p className="mt-1 text-sm">
        Crea una passkey para entrar con Face ID, también desde la app instalada.
      </p>
      <Link to="/ajustes" className={`${buttonPrimary} mt-3`}>
        Crear passkey en Ajustes
      </Link>
    </aside>
  );
}
