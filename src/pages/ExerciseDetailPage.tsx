import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useConfirm } from "@/components/ConfirmDialog";
import { ExercisePhoto } from "@/components/ExercisePhoto";
import { KgField } from "@/components/KgField";
import { NumberStepper } from "@/components/NumberStepper";
import { WeightChart } from "@/components/WeightChart";
import { Card, PageHeader, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";
import { useExercise } from "@/db/repositories/exercises";
import { addLog, deleteLog, useLogs } from "@/db/repositories/weightLogs";
import type { Exercise, WeightLog } from "@/db/types";
import { localDateKey } from "@/lib/dates";
import {
  EXERCISE_TYPE_LABEL,
  isCardio,
  isClass,
  logSummary,
  shortDate,
  targetLabel,
  usesKg,
} from "@/lib/labels";
import {
  KM_STEP,
  formatKg,
  formatPace,
  paceSecPerKm,
  parseKg,
  parseKm,
  stepKg,
} from "@/lib/numbers";

export function ExerciseDetailPage() {
  const { id } = useParams();
  const exercise = useExercise(id);
  const logs = useLogs(id);
  const [dialog, confirm] = useConfirm();
  const [saved, setSaved] = useState<string | null>(null);

  // La confirmación flota sobre la barra de pestañas y se oculta sola.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(null), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  if (exercise === undefined || logs === undefined) return null;
  if (exercise === null) {
    return (
      <>
        <PageHeader title="Ejercicio no encontrado" />
        <Link to="/ejercicios" className="underline">
          Volver a Ejercicios
        </Link>
      </>
    );
  }

  async function removeLog(log: WeightLog, type: Exercise["type"]) {
    const ok = await confirm({
      title: "¿Borrar este registro?",
      message: `${shortDate(log.date)} · ${logSummary(log, type)}`,
      confirmLabel: "Borrar registro",
    });
    if (ok) await deleteLog(log.id);
  }

  const chart = isCardio(exercise.type)
    ? { unit: "km" as const, data: logs.map((l) => ({ date: l.date, value: l.distanceKm })) }
    : usesKg(exercise.type)
      ? { unit: "kg" as const, data: logs.map((l) => ({ date: l.date, value: l.kg })) }
      : null;

  return (
    <>
      <Link
        to="/ejercicios"
        className="mb-2 inline-flex min-h-11 items-center font-medium text-muted"
      >
        ← Ejercicios
      </Link>
      <ExercisePhoto
        photoId={exercise.photoId}
        type={exercise.type}
        name={exercise.name}
        variant="full"
        alt={`Máquina o posición de ${exercise.name}`}
        className="mb-4 aspect-[4/3] w-full rounded-3xl"
      />
      <PageHeader
        title={exercise.name}
        subtitle={`${EXERCISE_TYPE_LABEL[exercise.type]} · ${targetLabel(exercise)}`}
      />

      {exercise.physioNotes && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Indicaciones de la fisio
          </h2>
          <p className="mt-2 whitespace-pre-line text-lg leading-relaxed">{exercise.physioNotes}</p>
        </Card>
      )}

      {/* key: al registrar, el formulario se reinicia con los nuevos "últimos" valores. */}
      <QuickLog
        key={logs[0]?.id ?? "vacio"}
        exercise={exercise}
        last={logs[0] ?? null}
        onSaved={setSaved}
      />
      {saved && (
        <p
          role="status"
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-xl rounded-2xl bg-accent p-4 text-center text-lg font-bold text-accent-contrast shadow-lg"
        >
          ✓ {saved}
        </p>
      )}

      {logs.length > 0 && (
        <Card className="mt-4">
          <h2 className="text-lg font-semibold">Historial</h2>
          {chart && (
            <div className="mt-3">
              <WeightChart data={chart.data} unit={chart.unit} />
            </div>
          )}
          <ul className="mt-3 divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 py-2">
                <span className="w-16 shrink-0 text-sm text-muted">{shortDate(log.date)}</span>
                <span className="flex-1">
                  <span className="font-semibold tabular-nums">
                    {logSummary(log, exercise.type)}
                  </span>
                  {log.note && <span className="block text-sm text-muted">{log.note}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => removeLog(log, exercise.type)}
                  aria-label={`Borrar registro del ${shortDate(log.date)}`}
                  className="grid size-11 place-items-center rounded-xl text-muted"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Link to={`/ejercicios/${exercise.id}/editar`} className={`${buttonSecondary} mt-4 w-full`}>
        Editar ejercicio
      </Link>
      {dialog}
    </>
  );
}

type QuickLogProps = {
  exercise: Exercise;
  last: WeightLog | null;
  onSaved: (message: string) => void;
};

/** Registro rápido del día, relleno con los últimos valores usados (o el objetivo). */
function QuickLog(props: QuickLogProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Registrar hoy</h2>
      {props.last && (
        <p className="mt-1 text-sm text-muted">
          Última vez ({shortDate(props.last.date)}):{" "}
          <strong className="text-text">{logSummary(props.last, props.exercise.type)}</strong>
        </p>
      )}
      {isCardio(props.exercise.type) ? <CardioForm {...props} /> : <StrengthForm {...props} />}
    </Card>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="note" className="text-sm font-medium">
        Nota (opcional)
      </label>
      <input
        id="note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        placeholder="Ej.: molestia en la rodilla"
        className={`${inputClass} mt-1`}
      />
    </div>
  );
}

function useSave(onSaved: QuickLogProps["onSaved"]) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function run(action: () => Promise<string>) {
    setSaving(true);
    setError(null);
    try {
      onSaved(await action());
    } catch {
      setError("No se pudo guardar. Revisa los datos.");
    } finally {
      setSaving(false);
    }
  }
  return { error, setError, saving, run };
}

/** Fuerza, estiramientos y clases: kilos ±2,5, series y repeticiones. */
function StrengthForm({ exercise, last, onSaved }: QuickLogProps) {
  const withKg = usesKg(exercise.type);
  const initialKg = last?.kg ?? exercise.targetKg;
  const [kg, setKg] = useState(initialKg !== null ? formatKg(initialKg) : "");
  const [sets, setSets] = useState(last?.sets ?? exercise.sets);
  const [reps, setReps] = useState(last?.reps ?? exercise.reps ?? 10);
  // Ejercicios por tiempo (planchas, estiramientos): segundos aguantados por serie.
  const timed = exercise.durationSec !== null && !isClass(exercise.type);
  const [holdSec, setHoldSec] = useState(last?.durationSec ?? exercise.durationSec ?? 30);
  const [note, setNote] = useState("");
  const { error, setError, saving, run } = useSave(onSaved);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const value = withKg ? parseKg(kg) : null;
    if (withKg && value === null) {
      setError("Escribe los kilos (por ejemplo 22,5).");
      return;
    }
    void run(async () => {
      await addLog(exercise.id, {
        date: localDateKey(new Date()),
        kg: value,
        sets,
        reps: exercise.durationSec ? null : reps,
        durationSec: timed ? holdSec : null,
        note,
      });
      return value !== null ? `Guardado: ${formatKg(value)} kg` : "Guardado";
    });
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-4" noValidate>
      {withKg && (
        <KgField id="kg" label="Peso" value={kg} onChange={setKg} invalid={error !== null} />
      )}
      <div className="grid grid-cols-2 gap-3">
        {!isClass(exercise.type) && (
          <NumberStepper
            id="log-sets"
            label="Series"
            value={sets}
            onChange={setSets}
            min={1}
            max={20}
          />
        )}
        {timed && (
          <NumberStepper
            id="log-hold"
            label="Segundos"
            value={holdSec}
            onChange={setHoldSec}
            min={1}
            max={3600}
          />
        )}
        {!exercise.durationSec && (
          <NumberStepper
            id="log-reps"
            label="Reps"
            value={reps}
            onChange={setReps}
            min={1}
            max={200}
          />
        )}
      </div>
      <NoteField value={note} onChange={setNote} />
      {error && (
        <p role="alert" className="font-medium text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving} className={buttonPrimary}>
        {saving ? "Guardando…" : isClass(exercise.type) ? "Marcar como hecha" : "Guardar"}
      </button>
    </form>
  );
}

/** Cardio: distancia (±0,5 km), tiempo, ritmo calculado y esfuerzo percibido 1–10. */
function CardioForm({ exercise, last, onSaved }: QuickLogProps) {
  const initialKm = last?.distanceKm ?? exercise.targetDistanceKm;
  const initialSec = last?.durationSec ?? exercise.durationSec ?? 0;
  const [km, setKm] = useState(initialKm !== null ? formatKg(initialKm) : "");
  const [minutes, setMinutes] = useState(Math.floor(initialSec / 60));
  const [seconds, setSeconds] = useState(initialSec % 60);
  const [effort, setEffort] = useState<number | null>(last?.effort ?? null);
  const [note, setNote] = useState("");
  const { error, setError, saving, run } = useSave(onSaved);

  const distance = km.trim() === "" ? null : parseKm(km);
  const durationSec = minutes * 60 + seconds;
  const pace = paceSecPerKm(distance, durationSec || null);
  const stepButton =
    "min-h-14 shrink-0 rounded-xl bg-surface-2 px-3 text-lg font-bold tabular-nums active:scale-95";

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (km.trim() !== "" && distance === null) {
      setError("Escribe la distancia en km (por ejemplo 5,5).");
      return;
    }
    void run(async () => {
      await addLog(exercise.id, {
        date: localDateKey(new Date()),
        kg: null,
        sets: 1,
        reps: null,
        distanceKm: distance,
        durationSec: durationSec > 0 ? durationSec : null,
        effort,
        note,
      });
      return distance !== null ? `Guardado: ${formatKg(distance)} km` : "Guardado";
    });
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-4" noValidate>
      <div>
        <label htmlFor="km" className="text-sm font-medium">
          Distancia
        </label>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            className={stepButton}
            aria-label="Restar medio kilómetro"
            onClick={() => setKm(formatKg(stepKg(distance ?? 0, -KM_STEP)))}
          >
            −0,5
          </button>
          <div className="relative min-w-0 flex-1">
            <input
              id="km"
              inputMode="decimal"
              autoComplete="off"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              aria-invalid={error !== null || undefined}
              className="min-h-14 w-full rounded-xl border border-border bg-surface pr-10 text-center text-2xl font-bold tabular-nums aria-invalid:border-danger"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted">
              km
            </span>
          </div>
          <button
            type="button"
            className={stepButton}
            aria-label="Sumar medio kilómetro"
            onClick={() => setKm(formatKg(stepKg(distance ?? 0, KM_STEP)))}
          >
            +0,5
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberStepper
          id="minutes"
          label="Minutos"
          value={minutes}
          onChange={setMinutes}
          min={0}
          max={1440}
        />
        <NumberStepper
          id="seconds"
          label="Segundos"
          value={seconds}
          onChange={setSeconds}
          min={0}
          max={59}
        />
      </div>

      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-lg" aria-live="polite">
        Ritmo: <strong className="tabular-nums">{pace !== null ? formatPace(pace) : "—"}</strong>
      </p>

      <fieldset>
        <legend className="text-sm font-medium">
          Esfuerzo percibido (1 = muy suave, 10 = máximo)
        </legend>
        <div className="mt-1 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <label
              key={n}
              className="grid min-h-12 cursor-pointer place-items-center rounded-xl border-2 border-border bg-surface text-lg font-bold has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                name="effort"
                value={n}
                checked={effort === n}
                onChange={() => setEffort(n)}
                className="sr-only"
              />
              {n}
            </label>
          ))}
        </div>
      </fieldset>

      <NoteField value={note} onChange={setNote} />
      {error && (
        <p role="alert" className="font-medium text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={saving} className={buttonPrimary}>
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
