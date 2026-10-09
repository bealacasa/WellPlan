import { Link, useNavigate } from "react-router";
import { TYPE_STYLE } from "@/components/typeStyle";
import { EmptyState, PageHeader, buttonPrimary } from "@/components/ui";
import { useExercises } from "@/db/repositories/exercises";
import { setAttending, useGymClasses } from "@/db/repositories/gymClasses";
import {
  WEEKDAYS,
  addToDay,
  hasDayTarget,
  removeFromDay,
  useWeekPlan,
} from "@/db/repositories/plan";
import { useSessions } from "@/db/repositories/sessions";
import type { Exercise, GymClass, PlanEntry, Session } from "@/db/types";
import { isoWeekday, weekdayName } from "@/lib/dates";
import { targetLabel } from "@/lib/labels";

/** Una entrada del día ya resuelta: sesión o ejercicio suelto. */
type DayEntry =
  | { entryId: string; kind: "session"; session: Session }
  | { entryId: string; kind: "exercise"; exercise: Exercise; entry: PlanEntry };

export function PlanPage() {
  const plan = useWeekPlan();
  const sessions = useSessions();
  const exercises = useExercises();
  const classes = useGymClasses();
  if (!plan || !sessions || !exercises || !classes) return null;

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const today = isoWeekday(new Date());

  if (sessions.length === 0 && exercises.length === 0 && classes.length === 0) {
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
        subtitle="Qué toca cada día: sesiones, ejercicios sueltos y clases."
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
                return exercise ? [{ entryId: entry.id, kind: "exercise", exercise, entry }] : [];
              }
              const session = entry.sessionId ? sessionById.get(entry.sessionId) : undefined;
              return session ? [{ entryId: entry.id, kind: "session", session }] : [];
            })}
            classes={classes.filter((c) => c.weekday === day && c.attending)}
            sessions={sessions}
            exercises={exercises}
          />
        ))}
      </ul>

      <p className="mt-6 text-center text-sm text-muted">
        Las sesiones se crean en{" "}
        <Link to="/sesiones" className="font-semibold text-accent underline">
          Ejercicios → Sesiones
        </Link>{" "}
        y las clases del gimnasio en{" "}
        <Link to="/horario" className="font-semibold text-accent underline">
          Horario
        </Link>
        .
      </p>
    </>
  );
}

function DayCard({
  weekday,
  isToday,
  entries,
  classes,
  sessions,
  exercises,
}: {
  weekday: number;
  isToday: boolean;
  entries: DayEntry[];
  classes: GymClass[];
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
  const navigate = useNavigate();

  async function add(value: string) {
    const [kind, id] = value.split(":");
    if (!id) return;
    const entryId = await addToDay(weekday, kind === "s" ? { sessionId: id } : { exerciseId: id });
    // Cardio: se pregunta el objetivo de ese día (distancia, tiempo, CaCo…).
    if (kind === "e" && exercises.find((e) => e.id === id)?.type === "cardio") {
      navigate(`/plan/objetivo/${entryId}`);
    }
  }

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
      {classes.length > 0 && (
        <ul className="mt-2 space-y-2" aria-label={`Clases del ${weekdayName(weekday)}`}>
          {classes.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-2xl bg-accent-soft py-1 pl-3 pr-1 font-bold"
            >
              <Link
                to={`/horario?dia=${weekday}`}
                className="flex min-h-11 flex-1 items-center gap-2"
              >
                <span className="text-accent tabular-nums">{c.startTime}</span>
                {c.name}
              </Link>
              {/* Solo deja de estar marcada con "Voy": la clase sigue en el horario. */}
              <button
                type="button"
                onClick={() => void setAttending(c.id, false)}
                aria-label={`Quitar la clase de ${c.name} del ${name}`}
                className="grid size-11 place-items-center rounded-lg font-bold"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {entries.length === 0 ? (
        classes.length === 0 && <p className="mt-1 text-sm text-muted">Descanso</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {entries.map((entry) => {
            const label = entry.kind === "session" ? entry.session.name : entry.exercise.name;
            const style = entry.kind === "exercise" ? TYPE_STYLE[entry.exercise.type] : null;
            const cardio = entry.kind === "exercise" && entry.exercise.type === "cardio";
            const dayTarget =
              cardio && hasDayTarget(entry.entry)
                ? targetLabel({ ...entry.exercise, ...dayTargetOf(entry.entry) })
                : null;
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
                      : cardio
                        ? `/plan/objetivo/${entry.entryId}`
                        : `/ejercicios/${entry.exercise.id}`
                  }
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center pl-1"
                >
                  {label}
                  {cardio && (
                    <span className="text-xs font-semibold opacity-80">
                      {dayTarget ? `Hoy toca: ${dayTarget}` : "Objetivo del día…"}
                    </span>
                  )}
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
            onChange={(e) => void add(e.target.value)}
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

const dayTargetOf = (e: PlanEntry) => ({
  targetDistanceKm: e.targetDistanceKm,
  durationSec: e.durationSec,
  intervalRunSec: e.intervalRunSec,
  intervalWalkSec: e.intervalWalkSec,
  intervalRounds: e.intervalRounds,
});
