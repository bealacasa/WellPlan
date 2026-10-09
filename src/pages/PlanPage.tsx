import { Link } from "react-router";
import { TYPE_STYLE } from "@/components/typeStyle";
import { EmptyState, PageHeader, buttonPrimary, buttonSecondary } from "@/components/ui";
import { useExercises } from "@/db/repositories/exercises";
import { WEEKDAYS, addToDay, removeFromDay, useWeekPlan } from "@/db/repositories/plan";
import { useSessions } from "@/db/repositories/sessions";
import type { Exercise, Session } from "@/db/types";
import { isoWeekday, weekdayName, weekdayShort } from "@/lib/dates";

/** Una entrada del día ya resuelta: sesión o ejercicio suelto. */
type DayEntry =
  | { entryId: string; kind: "session"; session: Session }
  | { entryId: string; kind: "exercise"; exercise: Exercise };

export function PlanPage() {
  const plan = useWeekPlan();
  const sessions = useSessions();
  const exercises = useExercises();
  if (!plan || !sessions || !exercises) return null;

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const today = isoWeekday(new Date());
  const daysOf = (sessionId: string) =>
    WEEKDAYS.filter((d) => plan[d]?.some((e) => e.sessionId === sessionId)).map(weekdayShort);

  if (sessions.length === 0 && exercises.length === 0) {
    return (
      <>
        <PageHeader title="Plan semanal" subtitle="Qué toca cada día." />
        <EmptyState title="Aún no tienes ejercicios">
          <p>Crea tus ejercicios y asígnalos a los días que entrenas, solos o en sesiones.</p>
          <Link to="/ejercicios/nuevo" className={`${buttonPrimary} mt-4`}>
            + Añadir ejercicio
          </Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Plan semanal"
        subtitle="Qué toca cada día: sesiones o ejercicios sueltos."
      />

      <ul className="space-y-2" aria-label="Días de la semana">
        {WEEKDAYS.map((day) => (
          <DayCard
            key={day}
            weekday={day}
            isToday={day === today}
            entries={(plan[day] ?? []).flatMap((entry): DayEntry[] => {
              if (entry.exerciseId) {
                const exercise = exerciseById.get(entry.exerciseId);
                return exercise ? [{ entryId: entry.id, kind: "exercise", exercise }] : [];
              }
              const session = entry.sessionId ? sessionById.get(entry.sessionId) : undefined;
              return session ? [{ entryId: entry.id, kind: "session", session }] : [];
            })}
            sessions={sessions}
            exercises={exercises}
          />
        ))}
      </ul>

      <section className="mt-8" aria-labelledby="sesiones">
        <h2 id="sesiones" className="text-xl font-bold">
          Sesiones
        </h2>
        <p className="mb-3 text-sm text-muted">
          Grupos de ejercicios en orden, como «Pierna + core».
        </p>
        <Link to="/sesiones/nueva" className={`${buttonSecondary} mb-3 w-full`}>
          + Nueva sesión
        </Link>
        <ul className="space-y-2">
          {sessions.map((s) => {
            const days = daysOf(s.id);
            return (
              <li key={s.id}>
                <Link
                  to={`/sesiones/${s.id}`}
                  className="block min-h-16 rounded-3xl border border-border bg-surface p-4 shadow-sm active:scale-[0.99]"
                >
                  <span className="block text-lg font-bold">{s.name}</span>
                  <span className="block text-sm text-muted">
                    {s.exerciseIds.length} {s.exerciseIds.length === 1 ? "ejercicio" : "ejercicios"}
                    {days.length > 0 ? ` · ${days.join(", ")}` : " · sin día asignado"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function DayCard({
  weekday,
  isToday,
  entries,
  sessions,
  exercises,
}: {
  weekday: number;
  isToday: boolean;
  entries: DayEntry[];
  sessions: Session[];
  exercises: Exercise[];
}) {
  const assigned = new Set(
    entries.map((e) => (e.kind === "session" ? `s:${e.session.id}` : `e:${e.exercise.id}`)),
  );
  const sessionOptions = sessions.filter((s) => !assigned.has(`s:${s.id}`));
  const exerciseOptions = exercises.filter((e) => !assigned.has(`e:${e.id}`));
  const name = weekdayName(weekday);
  const selectId = `day-${weekday}`;

  return (
    <li
      className={`rounded-3xl bg-surface p-4 shadow-sm ${
        isToday ? "border-2 border-accent shadow-lg shadow-accent/20" : "border border-border"
      }`}
    >
      <h3 className="flex items-center gap-2 text-lg font-bold capitalize">
        {name}
        {isToday && (
          <span className="rounded-full bg-linear-to-br from-accent to-accent-2 px-2.5 py-0.5 text-xs font-bold normal-case text-accent-contrast">
            Hoy
          </span>
        )}
      </h3>
      {entries.length === 0 ? (
        <p className="mt-1 text-sm text-muted">Descanso</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {entries.map((entry) => {
            const label = entry.kind === "session" ? entry.session.name : entry.exercise.name;
            const style = entry.kind === "exercise" ? TYPE_STYLE[entry.exercise.type] : null;
            return (
              <li
                key={entry.entryId}
                className={`flex items-center gap-2 rounded-2xl py-1 pl-2 pr-1 font-bold ${
                  style ? style.chip : "bg-accent-soft"
                }`}
              >
                {style && <style.Icon className="ml-1 size-5 shrink-0" />}
                <Link
                  to={
                    entry.kind === "session"
                      ? `/sesiones/${entry.session.id}`
                      : `/ejercicios/${entry.exercise.id}`
                  }
                  className="flex min-h-11 flex-1 items-center pl-1"
                >
                  {label}
                </Link>
                <button
                  type="button"
                  onClick={() => void removeFromDay(entry.entryId)}
                  aria-label={`Quitar ${label} del ${name}`}
                  className="grid size-11 place-items-center rounded-lg font-bold"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {(sessionOptions.length > 0 || exerciseOptions.length > 0) && (
        <div className="mt-2">
          <label htmlFor={selectId} className="sr-only">
            Añadir al {name}
          </label>
          {/* El selector nativo del iPhone (ruleta) se usa bien con una mano. */}
          <select
            id={selectId}
            value=""
            onChange={(e) => {
              const [kind, id] = e.target.value.split(":");
              if (!id) return;
              void addToDay(weekday, kind === "s" ? { sessionId: id } : { exerciseId: id });
            }}
            className="min-h-11 w-full rounded-xl border border-dashed border-border bg-transparent px-3 font-medium text-muted"
          >
            <option value="">+ Añadir sesión o ejercicio…</option>
            {sessionOptions.length > 0 && (
              <optgroup label="Sesiones">
                {sessionOptions.map((s) => (
                  <option key={s.id} value={`s:${s.id}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {exerciseOptions.length > 0 && (
              <optgroup label="Ejercicios sueltos">
                {exerciseOptions.map((e) => (
                  <option key={e.id} value={`e:${e.id}`}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}
    </li>
  );
}
