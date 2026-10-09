import { Link } from "react-router";
import { EmptyState, PageHeader, buttonPrimary } from "@/components/ui";
import { WEEKDAYS, addToDay, removeFromDay, useWeekPlan } from "@/db/repositories/plan";
import { useSessions } from "@/db/repositories/sessions";
import type { Session } from "@/db/types";
import { isoWeekday, weekdayName, weekdayShort } from "@/lib/dates";

export function PlanPage() {
  const plan = useWeekPlan();
  const sessions = useSessions();
  if (!plan || !sessions) return null;

  const byId = new Map(sessions.map((s) => [s.id, s]));
  const today = isoWeekday(new Date());
  const daysOf = (sessionId: string) =>
    WEEKDAYS.filter((d) => plan[d]?.some((e) => e.sessionId === sessionId)).map(weekdayShort);

  return (
    <>
      <PageHeader title="Plan semanal" subtitle="Qué sesiones tocan cada día." />

      {sessions.length === 0 ? (
        <EmptyState title="Aún no tienes sesiones">
          <p>Crea una sesión (por ejemplo, «Pierna + core») y asígnala a los días que entrenas.</p>
          <Link to="/sesiones/nueva" className={`${buttonPrimary} mt-4`}>
            + Nueva sesión
          </Link>
        </EmptyState>
      ) : (
        <>
          <ul className="space-y-2" aria-label="Días de la semana">
            {WEEKDAYS.map((day) => (
              <DayCard
                key={day}
                weekday={day}
                isToday={day === today}
                entries={(plan[day] ?? []).flatMap((entry) => {
                  const session = byId.get(entry.sessionId);
                  return session ? [{ entryId: entry.id, session }] : [];
                })}
                sessions={sessions}
              />
            ))}
          </ul>

          <section className="mt-8" aria-labelledby="sesiones">
            <h2 id="sesiones" className="mb-3 text-xl font-bold">
              Sesiones
            </h2>
            <Link to="/sesiones/nueva" className={`${buttonPrimary} mb-3`}>
              + Nueva sesión
            </Link>
            <ul className="space-y-2">
              {sessions.map((s) => {
                const days = daysOf(s.id);
                return (
                  <li key={s.id}>
                    <Link
                      to={`/sesiones/${s.id}`}
                      className="block min-h-16 rounded-2xl border border-border bg-surface p-4 active:scale-[0.99]"
                    >
                      <span className="block text-lg font-semibold">{s.name}</span>
                      <span className="block text-sm text-muted">
                        {s.exerciseIds.length}{" "}
                        {s.exerciseIds.length === 1 ? "ejercicio" : "ejercicios"}
                        {days.length > 0 ? ` · ${days.join(", ")}` : " · sin día asignado"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function DayCard({
  weekday,
  isToday,
  entries,
  sessions,
}: {
  weekday: number;
  isToday: boolean;
  entries: { entryId: string; session: Session }[];
  sessions: Session[];
}) {
  const assigned = new Set(entries.map((e) => e.session.id));
  const options = sessions.filter((s) => !assigned.has(s.id));
  const name = weekdayName(weekday);
  const selectId = `day-${weekday}`;

  return (
    <li
      className={`rounded-2xl border bg-surface p-4 ${isToday ? "border-accent" : "border-border"}`}
    >
      <h3 className="flex items-center gap-2 text-lg font-semibold capitalize">
        {name}
        {isToday && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold normal-case text-accent-contrast">
            Hoy
          </span>
        )}
      </h3>
      {entries.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Descanso</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {entries.map(({ entryId, session }) => (
            <li
              key={entryId}
              className="flex items-center gap-2 rounded-xl bg-accent-soft py-1 pl-3 pr-1"
            >
              <Link
                to={`/sesiones/${session.id}`}
                className="flex min-h-11 flex-1 items-center font-semibold"
              >
                {session.name}
              </Link>
              <button
                type="button"
                onClick={() => void removeFromDay(entryId)}
                aria-label={`Quitar ${session.name} del ${name}`}
                className="grid size-11 place-items-center rounded-lg font-bold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {options.length > 0 && (
        <div className="mt-2">
          <label htmlFor={selectId} className="sr-only">
            Añadir una sesión al {name}
          </label>
          {/* El selector nativo del iPhone (ruleta) se usa bien con una mano. */}
          <select
            id={selectId}
            value=""
            onChange={(e) => {
              if (e.target.value) void addToDay(weekday, e.target.value);
            }}
            className="min-h-11 w-full rounded-xl border border-dashed border-border bg-transparent px-3 font-medium text-muted"
          >
            <option value="">+ Añadir sesión…</option>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
}
