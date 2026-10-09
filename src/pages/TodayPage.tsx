import { Link } from "react-router";
import { ExercisePhoto } from "@/components/ExercisePhoto";
import { TypeChip } from "@/components/typeStyle";
import { Card, buttonPrimary } from "@/components/ui";
import { useTodayPlan, type TodayPlan } from "@/db/repositories/today";
import type { Exercise } from "@/db/types";
import { weekdayLabel } from "@/lib/dates";
import { EXERCISE_TYPE_LABEL, targetLabel } from "@/lib/labels";
import { PasskeyNudge } from "@/sync/PasskeyNudge";

export function TodayPage() {
  const now = new Date();
  const plan = useTodayPlan(now);
  const all = plan?.items.flatMap((item) => item.exercises) ?? [];
  const done = all.filter((e) => plan?.done.has(e.id)).length;

  return (
    <>
      <Hero date={now} plan={plan} total={all.length} done={done} />
      <PasskeyNudge />

      {plan === undefined ? null : plan.items.length === 0 ? (
        <NothingToday plan={plan} />
      ) : (
        <div className="space-y-4">
          {plan.items.map((item) => (
            <Card key={item.entryId}>
              {item.kind === "session" && (
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight">{item.title}</h2>
                  <span className="shrink-0 text-sm font-semibold text-muted tabular-nums">
                    {item.exercises.filter((e) => plan.done.has(e.id)).length}/
                    {item.exercises.length}
                  </span>
                </div>
              )}
              <ol className="space-y-2" aria-label={item.title}>
                {item.exercises.map((exercise, index) => (
                  <li key={exercise.id}>
                    <ExerciseRow
                      exercise={exercise}
                      index={item.kind === "session" ? index + 1 : null}
                      isDone={plan.done.has(exercise.id)}
                    />
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/** Fila de un ejercicio de hoy: abre su ficha para registrar; ✓ si ya está hecho. */
function ExerciseRow({
  exercise,
  index,
  isDone,
}: {
  exercise: Exercise;
  index: number | null;
  isDone: boolean;
}) {
  return (
    <Link
      to={`/ejercicios/${exercise.id}`}
      className={`flex min-h-20 items-center gap-3 rounded-2xl border p-2 pr-3 active:scale-[0.99] ${
        isDone ? "border-accent bg-accent-soft" : "border-border bg-surface"
      }`}
    >
      {index !== null && (
        <span className="w-5 shrink-0 text-center font-bold text-muted tabular-nums">{index}</span>
      )}
      <ExercisePhoto
        photoId={exercise.photoId}
        type={exercise.type}
        variant="thumb"
        alt=""
        className="size-14 shrink-0 rounded-xl"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-bold">{exercise.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <TypeChip type={exercise.type} label={EXERCISE_TYPE_LABEL[exercise.type]} />
          {targetLabel(exercise)}
        </span>
      </span>
      {isDone ? (
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-accent-contrast"
          aria-label="Hecho hoy"
        >
          ✓
        </span>
      ) : (
        <span aria-hidden="true" className="text-2xl text-muted">
          ›
        </span>
      )}
    </Link>
  );
}

/** Cabecera destacada: día, fecha y progreso de hoy. */
function Hero({
  date,
  plan,
  total,
  done,
}: {
  date: Date;
  plan: TodayPlan | undefined;
  total: number;
  done: number;
}) {
  const [weekday, ...rest] = weekdayLabel(date).split(", ");
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <header className="mb-5 overflow-hidden rounded-3xl bg-linear-to-br from-accent to-accent-2 p-6 text-accent-contrast shadow-lg shadow-accent/25">
      <p className="text-sm font-bold uppercase tracking-widest opacity-90" aria-hidden="true">
        Hoy
      </p>
      <h1 className="mt-1 text-4xl font-extrabold tracking-tight">
        <span className="sr-only">Hoy, </span>
        {weekday}
      </h1>
      <p className="text-lg font-medium opacity-90">{rest.join(", ")}</p>
      {plan && (
        <div className="mt-5">
          {total === 0 ? (
            <p className="text-lg font-semibold">Día de descanso</p>
          ) : (
            <>
              <p className="text-lg font-semibold" aria-live="polite">
                {done === total
                  ? "¡Entrenamiento completado!"
                  : `${done} de ${total} ejercicios hechos`}
              </p>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full bg-black/15"
                role="progressbar"
                aria-label="Progreso de hoy"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={done}
              >
                {/* Sin style inline (CSP): anchura por clases en pasos del 10 %. */}
                <div className={`h-full rounded-full bg-current ${progressWidth(percent)}`} />
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}

const WIDTHS = [
  "w-0",
  "w-1/10",
  "w-2/10",
  "w-3/10",
  "w-4/10",
  "w-5/10",
  "w-6/10",
  "w-7/10",
  "w-8/10",
  "w-9/10",
  "w-full",
] as const;

/** Clase de anchura redondeada al 10 % más cercano (la CSP prohíbe estilos inline). */
export function progressWidth(percent: number): string {
  const step = Math.round(Math.min(100, Math.max(0, percent)) / 10);
  return WIDTHS[step] ?? "w-0";
}

/** Nada planificado hoy: guía de primeros pasos o recordatorio de descanso. */
function NothingToday({ plan }: { plan: TodayPlan }) {
  if (plan.hasExercises) {
    return (
      <Card>
        <h2 className="text-xl font-bold">Hoy no tienes nada planificado</h2>
        <p className="mt-1 text-muted">
          Descansa, o asigna una sesión o un ejercicio a este día en el plan.
        </p>
        <Link to="/plan" className={`${buttonPrimary} mt-4`}>
          Ver el plan semanal
        </Link>
      </Card>
    );
  }
  const steps = [
    "Añade tus ejercicios con foto e indicaciones",
    "Si quieres, agrúpalos en sesiones (p. ej. «Pierna + core»)",
    "Asigna sesiones o ejercicios a los días que entrenas",
  ];
  return (
    <Card>
      <h2 className="text-xl font-bold">Prepara tu plan en 3 pasos</h2>
      <ol className="mt-3 space-y-2">
        {steps.map((text, i) => (
          <li key={text} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 font-bold">
              {i + 1}
            </span>
            <span className="font-medium">{text}</span>
          </li>
        ))}
      </ol>
      <Link to="/ejercicios/nuevo" className={`${buttonPrimary} mt-5`}>
        Empezar
      </Link>
    </Card>
  );
}
