import { Link } from "react-router";
import { LibraryTabs } from "@/components/LibraryTabs";
import { EmptyState, PageHeader, buttonPrimary } from "@/components/ui";
import { WEEKDAYS, useWeekPlan } from "@/db/repositories/plan";
import { useSessions } from "@/db/repositories/sessions";
import { weekdayShort } from "@/lib/dates";

/** Lista de sesiones: grupos de ejercicios en orden, con los días en que tocan. */
export function SessionsPage() {
  const sessions = useSessions();
  const plan = useWeekPlan();
  const daysOf = (sessionId: string) =>
    WEEKDAYS.filter((d) => plan?.[d]?.some((e) => e.sessionId === sessionId)).map(weekdayShort);

  return (
    <>
      <PageHeader title="Sesiones" subtitle="Grupos de ejercicios en orden, como «Glúteo»." />
      <LibraryTabs />
      <Link to="/sesiones/nueva" className={`${buttonPrimary} mb-5`}>
        + Nueva sesión
      </Link>

      {sessions === undefined ? null : sessions.length === 0 ? (
        <EmptyState title="Todavía no hay sesiones">
          <p>Agrupa varios ejercicios para hacerlos juntos y asígnalos a un día en el Plan.</p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const days = daysOf(s.id);
            return (
              <li key={s.id}>
                <Link
                  to={`/sesiones/${s.id}`}
                  className="flex min-h-20 items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm active:scale-[0.99]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold">{s.name}</span>
                    <span className="block text-sm text-muted">
                      {s.exerciseIds.length}{" "}
                      {s.exerciseIds.length === 1 ? "ejercicio" : "ejercicios"}
                      {days.length > 0 ? ` · ${days.join(", ")}` : " · sin día asignado"}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-2xl text-muted">
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
