import { AlertIcon } from "@/components/icons";
import { Card } from "@/components/ui";
import { useAlerts } from "./alerts";

function Item({ ok, title, children }: { ok: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`grid size-8 shrink-0 place-items-center rounded-full font-bold ${
          ok ? "bg-accent text-accent-contrast" : "bg-warning-bg text-warning-text"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      <div className="text-sm leading-relaxed">
        <p className="font-semibold">
          <span className="sr-only">{ok ? "Correcto: " : "Atención: "}</span>
          {title}
        </p>
        <div className="text-muted">{children}</div>
      </div>
    </li>
  );
}

/** Estado de la protección de tus datos: almacenamiento, instalación y copia en la nube. */
export function AlertsCard() {
  const alerts = useAlerts();

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <AlertIcon className="size-5" /> Avisos
      </h2>
      {alerts.atRisk && (
        <p className="mt-2 rounded-xl bg-warning-bg p-3 text-sm font-semibold text-warning-text">
          Tus datos solo están en este dispositivo y el navegador podría borrarlos.
        </p>
      )}
      <ul className="mt-4 space-y-4">
        <Item
          ok={alerts.persisted === true}
          title={
            alerts.persisted === true
              ? "Almacenamiento protegido"
              : "El navegador podría borrar los datos"
          }
        >
          {alerts.persisted === true
            ? "El sistema se ha comprometido a no borrar los datos de WellPlan."
            : "Safari puede borrar los datos de webs que no se usan durante un tiempo."}
        </Item>
        <Item
          ok={alerts.installed}
          title={alerts.installed ? "App instalada" : "Instálala en la pantalla de inicio"}
        >
          {alerts.installed ? (
            "Funciona sin conexión y sus datos son más estables."
          ) : (
            <>
              En Safari: <strong>Compartir → Añadir a pantalla de inicio</strong>.
            </>
          )}
        </Item>
        {alerts.cloudConfigured && (
          <Item
            ok={alerts.signedIn}
            title={alerts.signedIn ? "Copia en la nube activa" : "Sin copia en la nube"}
          >
            {alerts.signedIn
              ? "Tus datos se sincronizan con tu cuenta (servidores en la UE)."
              : "Inicia sesión arriba para guardar una copia de tus datos."}
          </Item>
        )}
      </ul>
    </Card>
  );
}
