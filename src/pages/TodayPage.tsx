import { createContext, use, useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { ExercisePhoto } from "@/components/ExercisePhoto";
import { SessionPhoto } from "@/components/SessionPhoto";
import { TypeChip } from "@/components/typeStyle";
import { Card, buttonPrimary } from "@/components/ui";
import { streakLabel, useProgress, weekSummary } from "@/db/repositories/progress";
import { useTodayPlan, type TodayPlan } from "@/db/repositories/today";
import { deleteLog, quickLog, restoreLogs, unmarkDay } from "@/db/repositories/weightLogs";
import type { Exercise, WeightLog } from "@/db/types";
import { localDateKey } from "@/lib/dates";
import { EXERCISE_TYPE_LABEL, isClass, logSummary, targetLabel } from "@/lib/labels";
import { formatKg } from "@/lib/numbers";
import { hadDiscomfort, quickLogInput } from "@/lib/progression";

/** Lo que necesita cada fila: últimos registros, sugerencias y el registro de un toque. */
type RowState = {
  lastLogs: ReadonlyMap<string, WeightLog>;
  suggestions: ReadonlyMap<string, number>;
  onQuickLog: (exercise: Exercise) => void;
  onUnmark: (exercise: Exercise) => void;
};
const RowContext = createContext<RowState | null>(null);

/** Aviso de "registrado" o "desmarcado" con opción de deshacer (por si se toca sin querer). */
function useUndoToast() {
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const element = toast && (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-accent p-3 pl-4 text-accent-contrast shadow-lg"
    >
      <span className="min-w-0 flex-1 font-bold">✓ {toast.text}</span>
      <button
        type="button"
        onClick={() => {
          toast.undo();
          setToast(null);
        }}
        className="min-h-11 shrink-0 rounded-xl bg-black/15 px-4 font-bold"
      >
        Deshacer
      </button>
    </div>
  );
  return [element, setToast] as const;
}
import { PasskeyNudge } from "@/sync/PasskeyNudge";

export function TodayPage() {
  const now = new Date();
  const plan = useTodayPlan(now);
  const all = plan?.items.flatMap((item) => item.exercises) ?? [];
  const done = all.filter((e) => plan?.done.has(e.id)).length;
  const [openIds, toggle] = useOpenSessions(localDateKey(now));
  const [toast, showToast] = useUndoToast();
  const rowState: RowState | null = plan
    ? {
        lastLogs: plan.lastLogs,
        suggestions: plan.suggestions,
        onQuickLog: (exercise) =>
          void quickLog(exercise, localDateKey(new Date())).then(
            (logId) =>
              logId &&
              showToast({
                text: `${exercise.name} registrado`,
                undo: () => void deleteLog(logId),
              }),
          ),
        onUnmark: (exercise) =>
          void unmarkDay(exercise.id, localDateKey(new Date())).then((ids) =>
            showToast({
              text: `${exercise.name} desmarcado`,
              undo: () => void restoreLogs(ids),
            }),
          ),
      }
    : null;

  return (
    <RowContext value={rowState}>
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
      {plan?.hasExercises && <ProgressLink today={now} />}
      {toast}
    </RowContext>
  );
}

/** Resumen de la semana con enlace a la pantalla de Progreso. */
function ProgressLink({ today }: { today: Date }) {
  const progress = useProgress(today);
  if (!progress) return null;
  return (
    <Link
      to="/progreso"
      className="mt-4 flex min-h-16 items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-sm active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Tu progreso</span>
        <span className="block text-sm text-muted">
          Esta semana: {weekSummary(progress)}
          {progress.streak > 0 && ` · racha de ${streakLabel(progress.streak)}`}
        </span>
      </span>
      <span aria-hidden="true" className="text-2xl text-muted">
        ›
      </span>
    </Link>
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
          <SessionPhoto
            photoId={photoId}
            name={title}
            exerciseNames={exercises.map((e) => e.name)}
            className="size-14 shrink-0 rounded-xl"
          />
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

/**
 * Fila de un ejercicio de hoy. Tocarla abre su ficha; el botón ✓ lo registra igual que la
 * última vez (o según el objetivo). Si ya está hecho hoy, se marca con ✓.
 */
function ExerciseRow({
  exercise,
  index,
  isDone,
}: {
  exercise: Exercise;
  index: number | null;
  isDone: boolean;
}) {
  const state = use(RowContext);
  const last = state?.lastLogs.get(exercise.id) ?? null;
  const suggestion = isDone ? undefined : state?.suggestions.get(exercise.id);
  const quick = !isDone && state ? quickLogInput(exercise, last) : null;
  // La última vez hubo molestias: no se repite de un toque, se registra en la ficha.
  const discomfort = !isDone && hadDiscomfort(last);
  // Cardio: se muestra el objetivo (del día); el resto, lo que se registraría.
  const detail =
    last && exercise.type !== "cardio" && !isClass(exercise.type)
      ? `Última: ${logSummary(last, exercise.type)}`
      : targetLabel(exercise);

  return (
    <div
      className={`flex min-h-20 items-center gap-2 rounded-2xl border p-2 ${
        isDone ? "border-accent bg-accent-soft" : "border-border bg-surface"
      }`}
    >
      <Link
        to={`/ejercicios/${exercise.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.99]"
      >
        {index !== null && (
          <span className="w-5 shrink-0 text-center font-bold text-muted tabular-nums">
            {index}
          </span>
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
          <span className="line-clamp-2 block text-lg leading-tight font-bold">
            {exercise.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <TypeChip type={exercise.type} label={EXERCISE_TYPE_LABEL[exercise.type]} />
            {detail}
            {discomfort && (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 font-bold text-danger">
                Molestias la última vez
              </span>
            )}
            {suggestion !== undefined && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-bold text-accent">
                ↑ Prueba {formatKg(suggestion)} kg
              </span>
            )}
          </span>
        </span>
      </Link>
      {isDone && state ? (
        <button
          type="button"
          onClick={() => state.onUnmark(exercise)}
          aria-label={`Hecho hoy. Desmarcar ${exercise.name}`}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-accent-contrast active:scale-95"
        >
          ✓
        </button>
      ) : quick && state ? (
        <button
          type="button"
          onClick={() => state.onQuickLog(exercise)}
          aria-label={
            isClass(exercise.type)
              ? `Marcar ${exercise.name} como hecha`
              : `Registrar ${exercise.name}: ${logSummary(quick, exercise.type)}`
          }
          className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-accent text-xl font-bold text-accent active:scale-95"
        >
          ✓
        </button>
      ) : (
        <span aria-hidden="true" className="mr-2 text-2xl text-muted">
          ›
        </span>
      )}
    </div>
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
