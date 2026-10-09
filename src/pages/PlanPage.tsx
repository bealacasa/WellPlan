import { EmptyState, PageHeader } from "@/components/ui";

export function PlanPage() {
  return (
    <>
      <PageHeader title="Plan semanal" subtitle="Tus sesiones de lunes a domingo." />
      <EmptyState title="Aún no tienes sesiones">
        <p>Aquí podrás crear sesiones (por ejemplo, «Pierna + core») y asignarlas a cada día.</p>
      </EmptyState>
    </>
  );
}
