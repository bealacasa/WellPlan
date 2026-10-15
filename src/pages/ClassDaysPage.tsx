import { useState } from "react";
import { Link, useParams } from "react-router";
import { useConfirm } from "@/components/ConfirmDialog";
import { Card, EmptyState, PageHeader, buttonPrimary, inputClass } from "@/components/ui";
import { useExerciseDays } from "@/db/repositories/progress";
import { addLog, deleteLog } from "@/db/repositories/weightLogs";
import { fromDateKey, localDateKey, weekdayLabel } from "@/lib/dates";

/**
 * Corregir las veces que fuiste a una clase (/progreso/clase/:id): ver los días, quitar
 * uno apuntado por error o añadir uno que se te olvidó.
 */
export function ClassDaysPage() {
  const { id } = useParams();
  const data = useExerciseDays(id);
  const [dialog, confirm] = useConfirm();
  const today = localDateKey(new Date());
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  if (data === undefined) return null;
  if (data === null) {
    return (
      <>
        <PageHeader title="Clase no encontrada" />
        <Link to="/progreso" className="underline">
          Volver a Progreso
        </Link>
      </>
    );
  }
  const { exercise, logs } = data;
  const days = [...new Map(logs.map((l) => [l.date, l])).values()];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
      setError("Elige un día de hoy o anterior.");
      return;
    }
    if (logs.some((l) => l.date === date)) {
      setError("Ese día ya está apuntado.");
      return;
    }
    setError(null);
    await addLog(exercise.id, { date, kg: null, sets: 1, reps: null, note: null });
  }

  async function remove(logIds: string[], day: string) {
    const ok = await confirm({
      title: "¿Quitar este día?",
      message: `${weekdayLabel(fromDateKey(day))}: ${exercise.name}`,
      confirmLabel: "Quitar",
    });
    if (ok) for (const logId of logIds) await deleteLog(logId);
  }

  return (
    <>
      <Link
        to="/progreso"
        className="mb-2 inline-flex min-h-11 items-center font-medium text-muted"
      >
        ← Progreso
      </Link>
      <PageHeader title={exercise.name} subtitle="Los días que has ido." />

      <Card className="mb-4">
        <form onSubmit={add} noValidate className="space-y-3">
          <label htmlFor="class-day" className="block text-lg font-bold">
            Añadir un día
          </label>
          <input
            id="class-day"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
          {error && (
            <p role="alert" className="font-semibold text-danger">
              {error}
            </p>
          )}
          <button type="submit" className={buttonPrimary}>
            Apuntar que fui
          </button>
        </form>
      </Card>

      {days.length === 0 ? (
        <EmptyState title="Aún no hay ningún día apuntado" />
      ) : (
        <Card>
          <h2 className="text-lg font-bold">
            {days.length} {days.length === 1 ? "día" : "días"}
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {days.map((log) => (
              <li key={log.date} className="flex items-center gap-3 py-2">
                <span className="flex-1 text-lg">{weekdayLabel(fromDateKey(log.date))}</span>
                <button
                  type="button"
                  onClick={() =>
                    void remove(
                      logs.filter((l) => l.date === log.date).map((l) => l.id),
                      log.date,
                    )
                  }
                  aria-label={`Quitar el ${weekdayLabel(fromDateKey(log.date))}`}
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-muted"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {dialog}
    </>
  );
}
