import { useId, useState } from "react";
import { Link } from "react-router";
import { ExercisePhoto } from "@/components/ExercisePhoto";
import { SessionPhoto } from "@/components/SessionPhoto";
import { TypeChip } from "@/components/typeStyle";
import { Card, buttonPrimary } from "@/components/ui";
import { useTodayPlan, type TodayPlan } from "@/db/repositories/today";
import type { Exercise } from "@/db/types";
import { localDateKey } from "@/lib/dates";
import { EXERCISE_TYPE_LABEL, targetLabel } from "@/lib/labels";
import { PasskeyNudge } from "@/sync/PasskeyNudge";

export function TodayPage() {
  const now = new Date();
  const plan = useTodayPlan(now);
  const all = plan?.items.flatMap((item) => item.exercises) ?? [];
  const done = all.filter((e) => plan?.done.has(e.id)).length;
  const [openIds, toggle] = useOpenSessions(localDateKey(now));

  return (
    <>
      <Hero plan={plan} total={all.length} done={done} />
      <PasskeyNudge />

      {plan === undefined ? null : plan.items.length === 0 ? (
        <NothingToday plan={plan} />
      ) : (
        <div className="space-y-4">
          {plan.items.map((item) =>
            item.kind === "session" ? (
              <SessionCard
                key={item.entryId}
                title={item.title}
                photoId={item.photoId ?? null}
                exercises={item.exercises}
                done={plan.done}
                open={openIds.has(item.entryId)}
                onToggle={() => toggle(item.entryId)}
              />
            ) : (
              <Card key={item.entryId}>
                {item.kind === "class" && (
                  <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-base font-bold text-accent tabular-nums">
                      <span className="sr-only">Clase a las </span>
                      {item.time}
                    </span>
                    {item.detail}
                  </p>
                )}
                <ExerciseList title={item.title} exercises={item.exercises} done={plan.done} />
              </Card>
            ),
          )}
        </div>
      )}
    </>
  );
}

const OPEN_KEY = "wellplan:hoy-abiertas";

/**
 * Qué sesiones están desplegadas. Empiezan plegadas para no tener que hacer scroll; se
 * recuerda durante el día (sessionStorage) para que, al volver de registrar un ejercicio,
 * la sesión siga abierta. Si el almacenamiento falla, funciona igual pero sin recordar.
 */
function useOpenSessions(day: string): [Set<string>, (id: string) => void] {
  const [open, setOpen] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? "null") as {
        day?: string;
        ids?: unknown;
      } | null;
      if (saved?.day === day && Array.isArray(saved.ids)) {
        return new Set(saved.ids.filter((id): id is string => typeof id === "string"));
      }
    } catch {
      // Sin almacenamiento (modo privado, etc.): todo plegado.
    }
    return new Set();
  });

  const toggle = (id: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      try {
        sessionStorage.setItem(OPEN_KEY, JSON.stringify({ day, ids: [...next] }));
      } catch {
        // Se pierde solo el recuerdo; el despliegue funciona igual.
      }
      return next;
    });
  };

  return [open, toggle];
}

/** Sesión de hoy plegable: la cabecera muestra el progreso y el siguiente ejercicio. */
function SessionCard({
  title,
  photoId,
  exercises,
  done,
  open,
  onToggle,
}: {
  title: string;
  photoId: string | null;
  exercises: Exercise[];
  done: ReadonlySet<string>;
  open: boolean;
  onToggle: () => void;
}) {
  const listId = useId();
  const doneCount = exercises.filter((e) => done.has(e.id)).length;
  const complete = exercises.length > 0 && doneCount === exercises.length;
  const next = exercises.find((e) => !done.has(e.id));

  return (
    <Card>
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={listId}
          className="flex min-h-11 w-full items-center gap-3 text-left"
        >
          {photoId && <SessionPhoto photoId={photoId} className="size-14 shrink-0 rounded-xl" />}
          <span className="min-w-0 flex-1">
            <span className="block text-2xl font-extrabold tracking-tight">{title}</span>
            {!open && (
              <span className="mt-0.5 block truncate text-sm font-medium text-muted">
                {complete
                  ? "Completada"
                  : next
                    ? `Siguiente: ${next.name}`
                    : `${exercises.length} ejercicios`}
              </span>
            )}
          </span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${
              complete ? "bg-accent text-accent-contrast" : "bg-surface-2 text-muted"
            }`}
          >
            {complete && <span aria-hidden="true">✓ </span>}
            {doneCount}/{exercises.length}
            <span className="sr-only"> hechos</span>
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-2xl text-muted transition-transform motion-reduce:transition-none ${
              open ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
        </button>
      </h2>
      <div id={listId} hidden={!open} className="mt-4">
        <ExerciseList title={title} exercises={exercises} done={done} numbered />
      </div>
    </Card>
  );
}

function ExerciseList({
  title,
  exercises,
  done,
  numbered = false,
}: {
  title: string;
  exercises: Exercise[];
  done: ReadonlySet<string>;
  numbered?: boolean;
}) {
  return (
    <ol className="space-y-2" aria-label={title}>
      {exercises.map((exercise, index) => (
        <li key={exercise.id}>
          <ExerciseRow
            exercise={exercise}
            index={numbered ? index + 1 : null}
            isDone={done.has(exercise.id)}
          />
        </li>
      ))}
    </ol>
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
        name={exercise.name}
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

/** Cabecera destacada y compacta: progreso de hoy. */
function Hero({ plan, total, done }: { plan: TodayPlan | undefined; total: number; done: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <header className="mb-5 overflow-hidden rounded-3xl bg-linear-to-br from-accent to-accent-2 px-5 py-4 text-accent-contrast shadow-lg shadow-accent/25">
      <h1 className="text-3xl font-extrabold tracking-tight">Hoy</h1>
      {plan && (
        <div className="mt-2">
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
    "Asigna sesiones o ejercicios a los días que entrenas (o apúntate a clases en Horario)",
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
