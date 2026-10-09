import { useEffect, useState } from "react";
import { AlertIcon } from "@/components/icons";
import { isStandalone, requestPersistence, type PersistState } from "./storage";

/**
 * Pide almacenamiento persistente y, si el navegador no lo concede, explica cómo
 * proteger los datos: instalar la app y (cuando esté) usar la nube o las copias.
 */
export function StorageNotice() {
  const [state, setState] = useState<PersistState | null>(null);

  useEffect(() => {
    let active = true;
    requestPersistence().then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, []);

  if (state === null || state === "persisted") return null;
  const installed = isStandalone();

  return (
    <aside
      role="note"
      className="mb-5 flex gap-3 rounded-2xl bg-warning-bg p-4 text-warning-text"
      aria-label="Aviso sobre el almacenamiento"
    >
      <AlertIcon className="size-6 shrink-0" />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold">Tus datos podrían borrarse</p>
        {installed ? (
          <p>
            El sistema no garantiza conservar los datos de la app. Inicia sesión en Ajustes para
            guardarlos también en la nube.
          </p>
        ) : (
          <p>
            Safari puede borrar los datos de las webs. Instala WellPlan:{" "}
            <strong>Compartir → Añadir a pantalla de inicio</strong>, e inicia sesión en Ajustes
            para tener copia en la nube.
          </p>
        )}
      </div>
    </aside>
  );
}
