import { Link } from "react-router";
import { PageHeader, buttonSecondary } from "@/components/ui";

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Página no encontrada" />
      <Link to="/" className={buttonSecondary}>
        Volver a Hoy
      </Link>
    </>
  );
}
