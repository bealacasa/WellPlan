import { EmptyState, PageHeader } from "@/components/ui";

export function ExercisesPage() {
  return (
    <>
      <PageHeader title="Ejercicios" subtitle="Los ejercicios que te ha mandado tu fisio." />
      <EmptyState title="Todavía no hay ejercicios">
        <p>Aquí podrás añadirlos con foto de la máquina, indicaciones y kilos.</p>
      </EmptyState>
    </>
  );
}
