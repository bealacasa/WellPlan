import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useCardioTarget, type CardioTarget } from "@/components/CardioTargetFields";
import { PageHeader, buttonPrimary, buttonSecondary } from "@/components/ui";
import { useExercise } from "@/db/repositories/exercises";
import { NO_DAY_TARGET, hasDayTarget, setDayTarget, usePlanEntry } from "@/db/repositories/plan";
import type { Exercise, PlanEntry } from "@/db/types";
import { weekdayName } from "@/lib/dates";
import { targetLabel } from "@/lib/labels";

/** Objetivo de un ejercicio de cardio en un día concreto del plan (/plan/objetivo/:id). */
export function PlanTargetPage() {
  const { id } = useParams();
  const entry = usePlanEntry(id);
  const exercise = useExercise(entry?.exerciseId ?? undefined);
  if (entry === undefined || (entry && exercise === undefined)) return null;
  if (!entry || !exercise) {
    return (
      <>
        <PageHeader title="No encontrado" />
        <Link to="/plan" className="underline">
          Volver al plan
        </Link>
      </>
    );
  }
  return <TargetForm key={entry.id} entry={entry} exercise={exercise} />;
}

const targetOf = (t: CardioTarget): CardioTarget => ({
  targetDistanceKm: t.targetDistanceKm,
  durationSec: t.durationSec,
  intervalRunSec: t.intervalRunSec,
  intervalWalkSec: t.intervalWalkSec,
  intervalRounds: t.intervalRounds,
});

function TargetForm({ entry, exercise }: { entry: PlanEntry; exercise: Exercise }) {
  const navigate = useNavigate();
  const custom = hasDayTarget(entry);
  // Se parte del objetivo de ese día o, si no tiene, del del ejercicio.
  const target = useCardioTarget(targetOf(custom ? entry : exercise), "day");
  const [error, setError] = useState<string | null>(null);
  const day = weekdayName(entry.weekday);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const read = target.read();
    if (!read.ok) {
      setError(read.error);
      return;
    }
    await setDayTarget(entry.id, read.value);
    navigate("/plan", { replace: true });
  }

  async function resetToDefault() {
    await setDayTarget(entry.id, NO_DAY_TARGET);
    navigate("/plan", { replace: true });
  }

  return (
    <>
      <Link to="/plan" className="mb-2 inline-flex min-h-11 items-center font-medium text-muted">
        ← Plan
      </Link>
      <PageHeader eyebrow={`Objetivo del ${day}`} title={exercise.name} />
      <form onSubmit={save} className="space-y-5" noValidate>
        <p className="text-muted">
          Lo que quieres hacer este día. Habitualmente: <strong>{targetLabel(exercise)}</strong>.
        </p>
        <fieldset className="space-y-4 rounded-3xl border border-border p-4">
          <legend className="px-1 text-sm font-bold">Objetivo (opcional)</legend>
          {target.fields}
        </fieldset>
        {error && (
          <p role="alert" className="font-semibold text-danger">
            {error}
          </p>
        )}
        <button type="submit" className={buttonPrimary}>
          Guardar objetivo del {day}
        </button>
        {custom && (
          <button
            type="button"
            onClick={() => void resetToDefault()}
            className={`${buttonSecondary} w-full`}
          >
            Usar el objetivo habitual
          </button>
        )}
      </form>
    </>
  );
}
