import { Link, useSearchParams } from "react-router";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader, buttonPrimary } from "@/components/ui";
import { clearGymSchedule, setAttending, useGymClasses } from "@/db/repositories/gymClasses";
import { WEEKDAYS } from "@/db/repositories/plan";
import type { GymClass } from "@/db/types";
import { isoWeekday, weekdayName, weekdayShort } from "@/lib/dates";

/** Día elegido en la URL (?dia=3) para conservarlo al volver de editar una clase. */
function useSelectedDay(): [number, (day: number) => void] {
  const [params, setParams] = useSearchParams();
  const fromUrl = Number(params.get("dia"));
  const day = WEEKDAYS.includes(fromUrl as (typeof WEEKDAYS)[number])
    ? fromUrl
    : isoWeekday(new Date());
  return [day, (next) => setParams({ dia: String(next) }, { replace: true })];
}

/** Horario completo del gimnasio, día a día. Las clases marcadas con "Voy" salen en Hoy. */
export function SchedulePage() {
  const classes = useGymClasses();
  const [day, setDay] = useSelectedDay();
  const [dialog, confirm] = useConfirm();
  if (!classes) return null;

  const today = isoWeekday(new Date());
  const ofDay = classes.filter((c) => c.weekday === day);
  const attendingCount = classes.filter((c) => c.attending).length;

  async function clearAll() {
    const ok = await confirm({
      title: "¿Borrar todo el horario?",
      message:
        "Útil cuando el gimnasio cambia de horario. Tu historial de clases hechas no se borra.",
      confirmLabel: "Borrar horario",
    });
    if (ok) await clearGymSchedule();
  }

  return (
    <>
      <PageHeader
        title="Horario"
        subtitle="Las clases de tu gimnasio. Marca a las que vas y saldrán en Hoy."
      />

      <div role="group" aria-label="Día de la semana" className="mb-5 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => {
          const selected = d === day;
          const count = classes.filter((c) => c.weekday === d).length;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              aria-pressed={selected}
              aria-label={`${weekdayName(d)}${d === today ? " (hoy)" : ""}, ${count} ${
                count === 1 ? "clase" : "clases"
              }`}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl text-sm font-bold transition-colors ${
                selected
                  ? "bg-linear-to-br from-accent to-accent-2 text-accent-contrast shadow-md shadow-accent/25"
                  : d === today
                    ? "border-2 border-accent bg-surface"
                    : "border border-border bg-surface"
              }`}
            >
              {weekdayShort(d)}
              <span
                aria-hidden="true"
                className={`mt-1 size-1.5 rounded-full ${
                  count === 0 ? "" : selected ? "bg-current" : "bg-accent"
                }`}
              />
            </button>
          );
        })}
      </div>

      <h2 className="mb-3 text-2xl font-extrabold capitalize tracking-tight">{weekdayName(day)}</h2>

      {ofDay.length === 0 ? (
        <EmptyState title={classes.length === 0 ? "Aún no hay horario" : "Sin clases este día"}>
          <p>
            {classes.length === 0
              ? "Añade las clases de tu gimnasio: nombre, días y hora."
              : "Añade una clase o elige otro día."}
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-2" aria-label={`Clases del ${weekdayName(day)}`}>
          {ofDay.map((c) => (
            <ClassRow key={c.id} gymClass={c} />
          ))}
        </ul>
      )}

      <Link to={`/horario/nueva?dia=${day}`} className={`${buttonPrimary} mt-5`}>
        + Añadir clase
      </Link>

      {classes.length > 0 && (
        <div className="mt-8 text-center">
          <p className="text-sm text-muted">
            {classes.length} {classes.length === 1 ? "clase" : "clases"} en el horario ·{" "}
            {attendingCount} {attendingCount === 1 ? "marcada" : "marcadas"}
          </p>
          <button
            type="button"
            onClick={() => void clearAll()}
            className="mt-2 min-h-11 px-4 font-semibold text-danger"
          >
            Borrar todo el horario
          </button>
        </div>
      )}
      {dialog}
    </>
  );
}

function ClassRow({ gymClass: c }: { gymClass: GymClass }) {
  const details = [`${c.durationMin} min`, c.room, c.instructor].filter(Boolean).join(" · ");
  return (
    <li
      className={`flex items-center gap-2 rounded-3xl border bg-surface p-2 shadow-sm ${
        c.attending ? "border-accent" : "border-border"
      }`}
    >
      <Link
        to={`/horario/${c.id}`}
        aria-label={`${c.startTime}, ${c.name}, ${details}. Editar`}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 active:scale-[0.99]"
      >
        <span className="w-14 shrink-0 text-center text-lg font-extrabold tabular-nums">
          {c.startTime}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold">{c.name}</span>
          <span className="block truncate text-sm text-muted">{details}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => void setAttending(c.id, !c.attending)}
        aria-pressed={c.attending}
        aria-label={`Voy a ${c.name} a las ${c.startTime}`}
        className={`min-h-12 shrink-0 rounded-2xl px-4 font-bold transition-colors active:scale-95 ${
          c.attending
            ? "bg-linear-to-br from-accent to-accent-2 text-accent-contrast shadow-md shadow-accent/25"
            : "border border-border bg-surface-2 text-muted"
        }`}
      >
        {c.attending ? "✓ Voy" : "Voy"}
      </button>
    </li>
  );
}
