import { useSyncExternalStore } from "react";
import { onLocalChange } from "@/db/changes";
import { db } from "@/db/database";
import { getMeta } from "@/db/meta";
import { getSupabase, isCloudConfigured } from "./supabase";

/*
 * Decide CUÁNDO sincronizar: al abrir la app, al iniciar sesión, al recuperar la conexión,
 * al volver a la app y unos segundos después de cada cambio local. Nunca dos a la vez.
 */

export type SyncState = {
  status: "disabled" | "signed-out" | "idle" | "syncing" | "offline" | "error";
  message: string | null;
  lastSyncAt: string | null;
  pending: number;
};

let state: SyncState = {
  status: isCloudConfigured ? "signed-out" : "disabled",
  message: null,
  lastSyncAt: null,
  pending: 0,
};
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );
}

let running: Promise<void> | null = null;
let rerun = false;

/** El motor (y Zod) se cargan en diferido: no hacen falta para pintar la primera pantalla. */
const loadEngine = () => import("./engine");

async function refreshPending() {
  const { pendingCount } = await loadEngine();
  setState({
    pending: await pendingCount(db),
    lastSyncAt: (await getMeta<string>("lastSyncAt")) ?? null,
  });
}

async function run(): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) {
    setState({ status: "signed-out", message: null });
    return refreshPending();
  }
  if (!navigator.onLine) {
    setState({ status: "offline", message: "Sin conexión: se sincronizará al volver la red." });
    return refreshPending();
  }
  setState({ status: "syncing", message: null });
  const { AccountMismatchError, syncOnce } = await loadEngine();
  try {
    await syncOnce(db, supabase, userId);
    setState({ status: "idle", message: null });
  } catch (error) {
    setState({
      status: "error",
      message:
        error instanceof AccountMismatchError
          ? error.message
          : "No se pudo sincronizar. Se reintentará automáticamente.",
    });
  }
  await refreshPending();
}

/** Sincroniza ya (si hay otra pasada en curso, se encadena una más al terminar). */
export function syncNow(): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = run().finally(() => {
    running = null;
    if (rerun) {
      rerun = false;
      void syncNow();
    }
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | undefined;
function syncSoon(delayMs = 2000) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delayMs);
}

let started = false;

/** Arranca los disparadores de sincronización (una sola vez, desde main.tsx). */
export function startSync(): void {
  if (started) return;
  started = true;
  void refreshPending();
  if (!isCloudConfigured) return;

  onLocalChange(() => {
    void refreshPending();
    syncSoon();
  });
  window.addEventListener("online", () => void syncNow());
  window.addEventListener("offline", () =>
    setState({ status: "offline", message: "Sin conexión: se sincronizará al volver la red." }),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncSoon(500);
  });
  // Se carga en segundo plano tras la primera pantalla; al cargar, procesa también
  // la sesión que llega en el enlace del email.
  void getSupabase().then((supabase) =>
    supabase?.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) syncSoon(300);
      if (event === "SIGNED_OUT") setState({ status: "signed-out", message: null });
    }),
  );
  setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, 5 * 60_000);
}
