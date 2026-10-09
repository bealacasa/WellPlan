import { useEffect, useState } from "react";
import { useSession } from "@/sync/auth";
import { isCloudConfigured } from "@/sync/supabase";
import { isStandalone, requestPersistence, type PersistState } from "./storage";

// Se pide una sola vez por arranque y se comparte entre componentes.
let persistence: Promise<PersistState> | null = null;
const getPersistence = () => (persistence ??= requestPersistence());

export type Alerts = {
  /** El navegador garantiza no borrar los datos locales. */
  persisted: boolean | null;
  installed: boolean;
  cloudConfigured: boolean;
  signedIn: boolean;
  /**
   * Hay riesgo real de perder datos: el navegador podría borrarlos Y no hay copia en la
   * nube. Es lo único que muestra el punto en la pestaña Ajustes.
   */
  atRisk: boolean;
};

export function useAlerts(): Alerts {
  const { session, loading } = useSession();
  const [state, setState] = useState<PersistState | null>(null);

  useEffect(() => {
    let active = true;
    void getPersistence().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  // "unsupported" = el navegador no permite pedirlo: no sabemos, y no hay nada que hacer.
  const persisted = state === "persisted" ? true : state === "denied" ? false : null;
  const signedIn = session !== null;
  return {
    persisted,
    installed: isStandalone(),
    cloudConfigured: isCloudConfigured,
    signedIn,
    atRisk: persisted === false && !loading && !signedIn,
  };
}
