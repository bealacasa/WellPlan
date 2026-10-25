import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AddDoneButton } from "@/components/AddDoneButton";
import { useConfirm } from "@/components/ConfirmDialog";
import { TypeChip } from "@/components/typeStyle";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { logDoneOn } from "@/db/repositories/dayExtras";
import { useExercises } from "@/db/repositories/exercises";
import type { PlanTarget } from "@/db/repositories/plan";
import { useDayDetail } from "@/db/repositories/progress";
import { useSessions } from "@/db/repositories/sessions";
import type { Exercise } from "@/db/types";
import { deleteLog } from "@/db/repositories/weightLogs";
import { fromDateKey, localDateKey, weekdayLabel } from "@/lib/dates";
import { EXERCISE_TYPE_LABEL, feelingSummary, logSummary } from "@/lib/labels";

/** Qué hiciste un día concreto (/progreso/dia/2026-10-15): sesiones, clases y ejercicios. */
export function DayDetailPage() {
  const { date = "" } = useParams();
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const detail = useDayDetail(valid ? date : "0000-00-00");
  const exercises = useExercises();
  const sessions = useSessions();
  const [dialog, confirm] = useConfirm();
  const navigate = useNavigate();
  // Lo que no se pudo apuntar de un toque (sin kilos, cardio…): enlaces para registrarlo.
  const [pending, setPending] = useState<Exercise[]>([]);
  if (!detail) return null;
  // Solo hoy y días pasados: no se apunta nada en el futuro.
  const canAdd = valid && date <= localDateKey(new Date());
  const here = `/progreso/dia/${date}`;
  const logLink = (id: string) => `/hoy/${id}?fecha=${date}&volver=${encodeURIComponent(here)}`;

  /** Apuntar en este día algo que hiciste (un ejercicio o una sesión que ya existen). */
  async function addDone(target: PlanTarget) {
    const result = await logDoneOn(date, target);
    if ("exerciseId" in target && result.pending.length > 0) {
      navigate(logLink(target.exerciseId));
      return;
    }
    setPending(result.pending);
  }

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
      {canAdd && exercises && sessions && (
        <div className="mb-4">
          <AddDoneButton
            label="Apuntar algo hecho este día"
            ariaLabel="Apuntar algo hecho este día"
            sessions={sessions.map((x) => ({ id: x.id, name: x.name }))}
            exercises={exercises.map((x) => ({ id: x.id, name: x.name }))}
            onPick={(target) => void addDone(target)}
          />
          {pending.length > 0 && (
            <div role="status" className="mt-3 rounded-2xl bg-accent-soft p-4">
              <p className="font-semibold">Falta apuntar los datos de:</p>
              <ul className="mt-2 space-y-2">
                {pending.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={logLink(e.id)}
                      className="flex min-h-12 items-center justify-between rounded-xl bg-surface px-4 font-bold"
                    >
                      {e.name} <span aria-hidden="true">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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
