import { useState } from "react";
import { Link } from "react-router";
import { Card, EmptyState, PageHeader, buttonPrimary } from "@/components/ui";
import { useReport } from "@/db/repositories/progress";
import { shortDate } from "@/lib/labels";
import { feelingLabel, reportText, type Report } from "@/lib/report";

const PERIODS = [2, 4, 8] as const;

/** Informe para el fisio: para enseñarlo en consulta o mandarlo por WhatsApp. */
export function ReportPage() {
  const [weeks, setWeeks] = useState<number>(4);
  const report = useReport(new Date(), weeks);

  return (
    <>
      <Link
        to="/progreso"
        className="mb-2 inline-flex min-h-11 items-center font-medium text-muted"
      >
        ← Progreso
      </Link>
      <PageHeader
        title="Informe para el fisio"
        subtitle="Lo que has hecho, cómo ha ido y las molestias."
      />
      <div
        role="group"
        aria-label="Periodo"
        className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1"
      >
        {PERIODS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeeks(w)}
            aria-pressed={weeks === w}
            className={`min-h-11 rounded-xl font-bold ${
              weeks === w ? "bg-surface text-text shadow-sm" : "text-muted"
            }`}
          >
            {w} semanas
          </button>
        ))}
      </div>
      {report === undefined ? null : report.exercises.length === 0 ? (
        <EmptyState title="Sin registros en este periodo">
          <p>Cuando registres ejercicios, aquí tendrás el resumen para tu fisio.</p>
        </EmptyState>
      ) : (
        <ReportView report={report} />
      )}
    </>
  );
}

function ReportView({ report: r }: { report: Report }) {
  const [shared, setShared] = useState<string | null>(null);

  async function share() {
    const text = reportText(r);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Informe WellPlan", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared("Copiado: pégalo en WhatsApp o en un correo.");
    } catch {
      // Cancelar el menú de compartir no es un error; si falla copiar, se avisa.
      if (!navigator.share) setShared("No se pudo copiar. Haz una captura de pantalla.");
    }
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => void share()} className={buttonPrimary}>
        Compartir informe
      </button>
      {shared && (
        <p role="status" className="text-center font-semibold text-accent">
          {shared}
        </p>
      )}

      <Card>
        <p className="text-sm font-bold uppercase tracking-wider text-accent">
          {shortDate(r.from)} – {shortDate(r.to)}
        </p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
          {r.trainedDays} {r.trainedDays === 1 ? "día" : "días"} entrenados
        </p>
        {r.plannedDays > 0 && <p className="text-muted">de {r.plannedDays} planificados</p>}
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Molestias</h2>
        {r.discomforts.length === 0 ? (
          <p className="mt-1 text-muted">Ninguna en este periodo.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {r.discomforts.map((d, i) => (
              <li key={`${d.date}-${i}`} className="rounded-2xl bg-danger/15 p-3">
                <p className="font-bold text-danger">
                  {shortDate(d.date)} · {d.exercise}
                </p>
                <p className="text-sm font-semibold">{d.detail}</p>
                {d.note && <p className="text-sm text-muted">«{d.note}»</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Por ejercicio</h2>
        <ul className="mt-3 divide-y divide-border">
          {r.exercises.map((e) => (
            <li key={e.name} className="py-3">
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-bold">{e.name}</span>
                <span className="shrink-0 text-sm font-semibold text-muted tabular-nums">
                  {e.times} {e.times === 1 ? "vez" : "veces"}
                </span>
              </p>
              <p className="text-sm tabular-nums">
                {e.first === e.last ? e.last : `${e.first} → ${e.last}`}
              </p>
              {e.avgFeeling !== null && (
                <p className="text-sm text-muted">Sensación media {feelingLabel(e.avgFeeling)}</p>
              )}
              {e.notes.map((n, i) => (
                <p key={i} className="text-sm text-muted">
                  {shortDate(n.date)}: {n.text}
                </p>
              ))}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
