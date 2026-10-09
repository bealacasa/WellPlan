import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useConfirm } from "@/components/ConfirmDialog";
import { KgField } from "@/components/KgField";
import { NumberStepper } from "@/components/NumberStepper";
import { PhotoPicker } from "@/components/PhotoPicker";
import { TYPE_STYLE } from "@/components/typeStyle";
import { PageHeader, buttonPrimary, inputClass } from "@/components/ui";
import {
  createExercise,
  deleteExercise,
  updateExercise,
  useExercise,
} from "@/db/repositories/exercises";
import { usePhotoUrl } from "@/db/repositories/photos";
import { EXERCISE_TYPES, type Exercise, type ExerciseType } from "@/db/types";
import type { ProcessedImage } from "@/lib/image";
import { EXERCISE_TYPE_LABEL, isCardio, isClass, usesDuration, usesKg } from "@/lib/labels";
import { formatKg, parseKg, parseKm } from "@/lib/numbers";
import { exerciseInputSchema } from "@/lib/validation";

/** Alta (/ejercicios/nuevo) y edición (/ejercicios/:id/editar). */
export function ExerciseFormPage() {
  const { id } = useParams();
  const exercise = useExercise(id);
  if (id && exercise === undefined) return null; // cargando
  if (id && exercise === null) {
    return (
      <>
        <PageHeader title="Ejercicio no encontrado" />
        <Link to="/ejercicios" className="underline">
          Volver a Ejercicios
        </Link>
      </>
    );
  }
  return <ExerciseForm key={id ?? "nuevo"} exercise={exercise ?? null} />;
}

function ExerciseForm({ exercise }: { exercise: Exercise | null }) {
  const navigate = useNavigate();
  const [dialog, confirm] = useConfirm();
  const currentPhoto = usePhotoUrl(exercise?.photoId ?? null, "full");

  const [name, setName] = useState(exercise?.name ?? "");
  const [type, setType] = useState<ExerciseType>(exercise?.type ?? "maquina");
  const [physioNotes, setPhysioNotes] = useState(exercise?.physioNotes ?? "");
  const [sets, setSets] = useState(exercise?.sets ?? 3);
  const [reps, setReps] = useState(exercise?.reps ?? 12);
  const [durationSec, setDurationSec] = useState(exercise?.durationSec ?? 30);
  // Las clases se editan en minutos (se guardan en segundos, como el resto).
  const [classMinutes, setClassMinutes] = useState(
    exercise?.type === "clase" && exercise.durationSec ? Math.round(exercise.durationSec / 60) : 60,
  );
  // Cardio: objetivos opcionales de distancia, tiempo e intervalos CaCo (en minutos enteros).
  const [targetKm, setTargetKm] = useState(
    exercise?.targetDistanceKm != null ? formatKg(exercise.targetDistanceKm) : "",
  );
  const [cardioMinutes, setCardioMinutes] = useState(
    exercise?.type === "cardio" && exercise.durationSec
      ? String(Math.round(exercise.durationSec / 60))
      : "",
  );
  const [useIntervals, setUseIntervals] = useState(exercise?.intervalRounds != null);
  const [runMin, setRunMin] = useState(Math.round((exercise?.intervalRunSec ?? 120) / 60));
  const [walkMin, setWalkMin] = useState(Math.round((exercise?.intervalWalkSec ?? 60) / 60));
  const [rounds, setRounds] = useState(exercise?.intervalRounds ?? 8);
  const [targetKg, setTargetKg] = useState(
    exercise?.targetKg != null ? formatKg(exercise.targetKg) : "",
  );
  const [image, setImage] = useState<ProcessedImage | "remove" | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const kg = targetKg.trim() === "" ? null : parseKg(targetKg);
    if (targetKg.trim() !== "" && kg === null) {
      setError("El peso objetivo debe ser un número entre 0 y 500 (por ejemplo 22,5).");
      return;
    }
    const cardio = isCardio(type);
    const km = cardio && targetKm.trim() !== "" ? parseKm(targetKm) : null;
    if (cardio && targetKm.trim() !== "" && km === null) {
      setError("La distancia debe ser un número de km (por ejemplo 5,5).");
      return;
    }
    const minutes = cardio && cardioMinutes.trim() !== "" ? Number(cardioMinutes) : null;
    if (minutes !== null && !(Number.isInteger(minutes) && minutes >= 1 && minutes <= 180)) {
      setError("El tiempo objetivo debe estar entre 1 y 180 minutos.");
      return;
    }
    const intervals = cardio && useIntervals;
    const parsed = exerciseInputSchema.safeParse({
      name,
      type,
      physioNotes,
      sets: isClass(type) || cardio ? 1 : sets,
      reps: usesDuration(type) || cardio ? null : reps,
      durationSec: isClass(type)
        ? classMinutes * 60
        : cardio
          ? minutes !== null
            ? minutes * 60
            : null
          : usesDuration(type)
            ? durationSec
            : null,
      targetKg: usesKg(type) ? kg : null,
      targetDistanceKm: km,
      intervalRunSec: intervals ? runMin * 60 : null,
      intervalWalkSec: intervals ? walkMin * 60 : null,
      intervalRounds: intervals ? rounds : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos.");
      return;
    }
    setSaving(true);
    try {
      if (exercise) {
        await updateExercise(exercise.id, parsed.data, image);
        navigate(`/ejercicios/${exercise.id}`, { replace: true });
      } else {
        const newId = await createExercise(parsed.data, image === "remove" ? undefined : image);
        navigate(`/ejercicios/${newId}`, { replace: true });
      }
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!exercise) return;
    const ok = await confirm({
      title: `¿Borrar «${exercise.name}»?`,
      message: "Se borrarán también su foto y todo su historial de pesos.",
      confirmLabel: "Borrar ejercicio",
    });
    if (!ok) return;
    await deleteExercise(exercise.id);
    navigate("/ejercicios", { replace: true });
  }

  return (
    <>
      <PageHeader title={exercise ? "Editar ejercicio" : "Nuevo ejercicio"} />
      <form onSubmit={save} className="space-y-5" noValidate>
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoCapitalize="sentences"
            placeholder="Ej.: Prensa de piernas"
            className={`${inputClass} mt-1`}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Tipo</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {EXERCISE_TYPES.map((t) => (
              <label
                key={t}
                className="flex min-h-14 cursor-pointer items-center gap-2 rounded-2xl border-2 border-border bg-surface px-3 font-bold has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
              >
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="sr-only"
                />
                <TypeTile type={t} />
                {EXERCISE_TYPE_LABEL[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <PhotoPicker currentUrl={currentPhoto} onChange={setImage} />

        <div>
          <label htmlFor="notes" className="text-sm font-medium">
            Indicaciones de la fisio
          </label>
          <textarea
            id="notes"
            rows={4}
            value={physioNotes}
            onChange={(e) => setPhysioNotes(e.target.value)}
            maxLength={4000}
            placeholder="Ej.: espalda pegada al respaldo, bajar despacio, no bloquear las rodillas…"
            className={`${inputClass} mt-1 py-3`}
          />
        </div>

        {isCardio(type) && (
          <fieldset className="space-y-4 rounded-3xl border border-border p-4">
            <legend className="px-1 text-sm font-bold">Objetivo (opcional)</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="target-km" className="text-sm font-medium">
                  Distancia (km)
                </label>
                <input
                  id="target-km"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ej.: 5"
                  value={targetKm}
                  onChange={(e) => setTargetKm(e.target.value)}
                  className={`${inputClass} mt-1 text-center text-lg font-bold`}
                />
              </div>
              <div>
                <label htmlFor="target-min" className="text-sm font-medium">
                  Tiempo (min)
                </label>
                <input
                  id="target-min"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="Ej.: 30"
                  value={cardioMinutes}
                  onChange={(e) => setCardioMinutes(e.target.value.replace(/D/g, ""))}
                  className={`${inputClass} mt-1 text-center text-lg font-bold`}
                />
              </div>
            </div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 px-4 font-semibold">
              <input
                type="checkbox"
                checked={useIntervals}
                onChange={(e) => setUseIntervals(e.target.checked)}
                className="size-6 accent-[var(--accent)]"
              />
              Intervalos CaCo (caminar-correr)
            </label>
            {useIntervals && (
              <div className="grid gap-3">
                <NumberStepper
                  id="run-min"
                  label="Correr (min)"
                  value={runMin}
                  onChange={setRunMin}
                  min={1}
                  max={60}
                />
                <NumberStepper
                  id="walk-min"
                  label="Andar (min)"
                  value={walkMin}
                  onChange={setWalkMin}
                  min={0}
                  max={60}
                />
                <NumberStepper
                  id="rounds"
                  label="Repeticiones"
                  value={rounds}
                  onChange={setRounds}
                  min={1}
                  max={100}
                />
              </div>
            )}
          </fieldset>
        )}

        <div className={`grid gap-4 sm:grid-cols-2 ${isCardio(type) ? "hidden" : ""}`}>
          {isClass(type) ? (
            <NumberStepper
              id="class-minutes"
              label="Duración (minutos)"
              value={classMinutes}
              onChange={setClassMinutes}
              min={5}
              max={180}
            />
          ) : (
            <NumberStepper
              id="sets"
              label="Series"
              value={sets}
              onChange={setSets}
              min={1}
              max={20}
            />
          )}
          {isClass(type) ? null : usesDuration(type) ? (
            <NumberStepper
              id="duration"
              label="Duración (segundos)"
              value={durationSec}
              onChange={setDurationSec}
              min={1}
              max={3600}
            />
          ) : (
            <NumberStepper
              id="reps"
              label="Repeticiones"
              value={reps}
              onChange={setReps}
              min={1}
              max={200}
            />
          )}
        </div>

        {usesKg(type) && (
          <KgField
            id="target"
            label="Peso objetivo (opcional)"
            value={targetKg}
            onChange={setTargetKg}
          />
        )}

        {error && (
          <p role="alert" className="font-medium text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Guardando…" : "Guardar ejercicio"}
        </button>
        {exercise && (
          <button
            type="button"
            onClick={remove}
            className="min-h-12 w-full rounded-2xl font-semibold text-danger"
          >
            Borrar ejercicio
          </button>
        )}
      </form>
      {dialog}
    </>
  );
}

function TypeTile({ type }: { type: ExerciseType }) {
  const { Icon, tile } = TYPE_STYLE[type];
  return (
    <span
      aria-hidden="true"
      className={`grid size-9 shrink-0 place-items-center rounded-xl ${tile}`}
    >
      <Icon className="size-5" />
    </span>
  );
}
