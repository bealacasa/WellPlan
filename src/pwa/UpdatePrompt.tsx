import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registra el service worker (desde el propio bundle, sin script inline) y avisa cuando
 * hay una versión nueva. No actualiza a mitad de un entrenamiento: decides tú cuándo.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-text p-4 text-bg shadow-lg"
    >
      <p className="flex-1 text-sm font-medium">
        {needRefresh ? "Hay una versión nueva de WellPlan." : "Lista para usar sin conexión."}
      </p>
      {needRefresh ? (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="min-h-11 rounded-xl bg-accent px-4 font-semibold text-accent-contrast"
        >
          Actualizar
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
        className="min-h-11 rounded-xl px-3 font-semibold"
      >
        {needRefresh ? "Luego" : "Vale"}
      </button>
    </div>
  );
}
