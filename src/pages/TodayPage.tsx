import { Link } from "react-router";
import { EmptyState, PageHeader, buttonSecondary } from "@/components/ui";
import { weekdayLabel } from "@/lib/dates";
import { StorageNotice } from "@/pwa/StorageNotice";
import { PasskeyNudge } from "@/sync/PasskeyNudge";

export function TodayPage() {
  return (
    <>
      <PageHeader title="Hoy" subtitle={weekdayLabel(new Date())} />
      <PasskeyNudge />
      <StorageNotice />
      <EmptyState title="No hay ninguna sesión para hoy">
        <p>Crea tus ejercicios y organiza la semana en Plan.</p>
        <Link to="/ejercicios" className={`${buttonSecondary} mt-4`}>
          Ir a Ejercicios
        </Link>
      </EmptyState>
    </>
  );
}
