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
import { EXERCISE_TYPE_LABEL, isClass, shortDate, targetLabel, usesKg } from "@/lib/labels";
import { formatKg, parseKg } from "@/lib/numbers";

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

  async function removeLog(log: WeightLog) {
    const ok = await confirm({
      title: "¿Borrar este registro?",
      message: `${shortDate(log.date)}${log.kg !== null ? ` · ${formatKg(log.kg)} kg` : ""}`,
      confirmLabel: "Borrar registro",
    });
    if (ok) await deleteLog(log.id);
  }

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

      {/* key: al registrar, el formulario se reinicia con el nuevo "último peso". */}
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
          {usesKg(exercise.type) && (
            <div className="mt-3">
              <WeightChart logs={logs} />
            </div>
          )}
          <ul className="mt-3 divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 py-2">
                <span className="w-16 shrink-0 text-sm text-muted">{shortDate(log.date)}</span>
                <span className="flex-1">
                  <span className="font-semibold tabular-nums">
                    {log.kg !== null ? `${formatKg(log.kg)} kg · ` : ""}
                    {log.sets} × {log.reps ?? "—"}
                  </span>
                  {log.note && <span className="block text-sm text-muted">{log.note}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => removeLog(log)}
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

/** Registro rápido del día, relleno con el último peso usado (o el objetivo). */
function QuickLog({
  exercise,
  last,
  onSaved,
}: {
  exercise: Exercise;
  last: WeightLog | null;
  onSaved: (message: string) => void;
}) {
  const withKg = usesKg(exercise.type);
  const initialKg = last?.kg ?? exercise.targetKg;
  const [kg, setKg] = useState(initialKg !== null ? formatKg(initialKg) : "");
  const [sets, setSets] = useState(last?.sets ?? exercise.sets);
  const [reps, setReps] = useState(last?.reps ?? exercise.reps ?? 10);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = withKg ? parseKg(kg) : null;
    if (withKg && value === null) {
      setMessage({ ok: false, text: "Escribe los kilos (por ejemplo 22,5)." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await addLog(exercise.id, {
        date: localDateKey(new Date()),
        kg: value,
        sets,
        reps: exercise.durationSec ? null : reps,
        note,
      });
      onSaved(value !== null ? `Guardado: ${formatKg(value)} kg` : "Guardado");
    } catch {
      setMessage({ ok: false, text: "No se pudo guardar. Revisa los datos." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Registrar hoy</h2>
      {last && (
        <p className="mt-1 text-sm text-muted">
          Última vez ({shortDate(last.date)}):{" "}
          <strong className="text-text">
            {last.kg !== null ? `${formatKg(last.kg)} kg · ` : ""}
            {last.sets} × {last.reps ?? "—"}
          </strong>
        </p>
      )}
      <form onSubmit={save} className="mt-4 space-y-4" noValidate>
        {withKg && (
          <KgField
            id="kg"
            label="Peso"
            value={kg}
            onChange={setKg}
            invalid={message?.ok === false}
          />
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
        <div>
          <label htmlFor="note" className="text-sm font-medium">
            Nota (opcional)
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ej.: molestia en la rodilla"
            className={`${inputClass} mt-1`}
          />
        </div>
        {message && (
          <p role="alert" className="font-medium text-danger">
            {message.text}
          </p>
        )}
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Guardando…" : isClass(exercise.type) ? "Marcar como hecha" : "Guardar"}
        </button>
      </form>
    </Card>
  );
}
