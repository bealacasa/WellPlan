import { useEffect, useState } from "react";
import { CloudIcon } from "@/components/icons";
import { Card, PageHeader } from "@/components/ui";
import { AccountCard } from "@/sync/AccountCard";
import { SyncCard } from "@/sync/SyncCard";
import { AlertsCard } from "@/pwa/AlertsCard";
import { isStandalone, storageUsage, type StorageUsage } from "@/pwa/storage";

const mbFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export function SettingsPage() {
  const [usage, setUsage] = useState<StorageUsage>(null);

  useEffect(() => {
    storageUsage().then(setUsage);
  }, []);

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-4">
        <AccountCard />
        <SyncCard />
        <AlertsCard />

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CloudIcon className="size-5" /> Almacenamiento en este dispositivo
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Modo</dt>
              <dd className="font-medium">
                {isStandalone() ? "App instalada" : "Navegador (instálala para más seguridad)"}
              </dd>
            </div>
            {usage && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Espacio usado</dt>
                <dd className="font-medium tabular-nums">{mbFormat.format(usage.usedMb)} MB</dd>
              </div>
            )}
          </dl>
        </Card>

        <p className="px-1 text-center text-xs text-muted">
          WellPlan · Sin analítica ni rastreadores.
        </p>
      </div>
    </>
  );
}
