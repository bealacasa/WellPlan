import { Link, useParams } from "react-router";
import { useConfirm } from "@/components/ConfirmDialog";
import { TypeChip } from "@/components/typeStyle";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { useDayDetail } from "@/db/repositories/progress";
import { deleteLog } from "@/db/repositories/weightLogs";
import { fromDateKey, weekdayLabel } from "@/lib/dates";
import { EXERCISE_TYPE_LABEL, feelingSummary, logSummary } from "@/lib/labels";

/** Qué hiciste un día concreto (/progreso/dia/2026-10-15): sesiones, clases y ejercicios. */
export function DayDetailPage() {
  const { date = "" } = useParams();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const detail = useDayDetail(valid ? date : "0000-00-00");
  const [dialog, confirm] = useConfirm();
  if (!detail) return null;

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: `¿Quitar «${name}» de este día?`,
      message: "Se borrará este registro del historial.",
      confirmLabel: "Quitar",
    });
    if (ok) await deleteLog(id);
  }

  return (
    <>
      <Link
        to="/progreso"
        className="mb-2 inline-flex min-h-11 items-center font-medium text-muted"
      >
        ← Progreso
      </Link>
      <PageHeader
        title={valid ? weekdayLabel(fromDateKey(date)) : "Día no válido"}
        subtitle="Lo que hiciste ese día."
      />
      {detail.logs.length === 0 ? (
        <EmptyState title="Ese día no registraste nada" />
      ) : (
        <div className="space-y-4">
          {detail.sessions.length > 0 && (
            <Card>
              <h2 className="text-lg font-bold">Sesiones</h2>
              <ul className="mt-2 space-y-1">
                {detail.sessions.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 text-lg">
                    <span className="font-semibold">{s.name}</span>
                    <span className="tabular-nums text-muted">
                      {s.done} de {s.total}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <h2 className="text-lg font-bold">Clases y ejercicios</h2>
            <ul className="mt-2 divide-y divide-border">
              {detail.logs.map(({ log, exercise }) => (
                <li key={log.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{exercise.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <TypeChip type={exercise.type} label={EXERCISE_TYPE_LABEL[exercise.type]} />
                      {logSummary(log, exercise.type)}
                    </span>
                    {feelingSummary(log) && (
                      <span className="block text-sm text-muted">{feelingSummary(log)}</span>
                    )}
                    {log.note && <span className="block text-sm text-muted">«{log.note}»</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(log.id, exercise.name)}
                    aria-label={`Quitar ${exercise.name} de este día`}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-muted"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      {dialog}
    </>
  );
}
