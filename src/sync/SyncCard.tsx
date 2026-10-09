import { Card, buttonSecondary } from "@/components/ui";
import { syncNow, useSyncState } from "./controller";

const timeFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" });

const LABEL: Record<string, string> = {
  idle: "Al día",
  syncing: "Sincronizando…",
  offline: "Sin conexión",
  error: "Con problemas",
};

/** Estado de la copia en la nube: cuándo se sincronizó y si quedan cambios por subir. */
export function SyncCard() {
  const sync = useSyncState();
  if (sync.status === "disabled" || sync.status === "signed-out") return null;

  return (
    <Card>
      <h2 className="text-lg font-semibold">Sincronización</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Estado</dt>
          <dd className="font-medium" aria-live="polite">
            {LABEL[sync.status]}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Cambios pendientes de subir</dt>
          <dd className="font-medium tabular-nums">{sync.pending}</dd>
        </div>
        {sync.lastSyncAt && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Última sincronización</dt>
            <dd className="font-medium">{timeFormat.format(new Date(sync.lastSyncAt))}</dd>
          </div>
        )}
      </dl>
      {sync.message && (
        <p role="status" className="mt-3 text-sm">
          {sync.message}
        </p>
      )}
      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={sync.status === "syncing"}
        className={`${buttonSecondary} mt-4 w-full`}
      >
        Sincronizar ahora
      </button>
    </Card>
  );
}
