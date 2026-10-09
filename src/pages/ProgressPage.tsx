import { Link } from "react-router";
import { Card, EmptyState, PageHeader, buttonSecondary } from "@/components/ui";
import {
  streakLabel,
  useProgress,
  weekSummary,
  type DayStatus,
  type Progress,
} from "@/db/repositories/progress";
import { weekdayName, weekdayShort } from "@/lib/dates";
import { shortDate } from "@/lib/labels";

/** Progreso: esta semana, racha, últimas 8 semanas y clases del mes. */
export function ProgressPage() {
  const progress = useProgress(new Date());
  if (!progress) return null;
  const nothingYet = progress.lastWeeks.every((w) => w.trained === 0);

  return (
    <>
      <Link to="/" className="mb-2 inline-flex min-h-11 items-center font-medium text-muted">
        ← Hoy
      </Link>
      <PageHeader title="Progreso" subtitle="Cuánto entrenas y si cumples tu plan." />
      <Link to="/progreso/informe" className={`${buttonSecondary} mb-4 w-full`}>
        Informe para el fisio
      </Link>
      {nothingYet ? (
        <EmptyState title="Aún no hay registros">
          <p>Cuando registres ejercicios o marques clases como hechas, verás aquí tu progreso.</p>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <WeekCard progress={progress} />
          <WeeksChart progress={progress} />
          <ClassesCard progress={progress} />
        </div>
      )}
    </>
  );
}

function WeekCard({ progress: p }: { progress: Progress }) {
  return (
    <Card>
      <h2 className="text-lg font-bold">Esta semana</h2>
      <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">{weekSummary(p)}</p>
      <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Días de esta semana">
        {p.week.map((d) => (
          <DayDot key={d.date} day={d} />
        ))}
      </ol>
      <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 font-semibold text-accent">
        {p.streak > 0
          ? `Racha: ${streakLabel(p.streak)}${p.streak > 1 ? " seguidas" : ""} cumpliendo el plan`
          : "Cumple el plan esta semana para empezar una racha"}
      </p>
    </Card>
  );
}

function DayDot({ day }: { day: DayStatus }) {
  const status = day.trained ? "entrenado" : day.planned ? "planificado, sin hacer" : "descanso";
  return (
    <li className="flex flex-col items-center gap-1">
      <span className="text-xs font-bold text-muted" aria-hidden="true">
        {weekdayShort(day.weekday)}
      </span>
      <span
        className={`grid size-10 place-items-center rounded-full font-bold ${
          day.trained
            ? "bg-linear-to-br from-accent to-accent-2 text-accent-contrast"
            : day.planned
              ? "border-2 border-dashed border-accent"
              : "bg-surface-2"
        }`}
      >
        <span aria-hidden="true">{day.trained ? "✓" : ""}</span>
        <span className="sr-only">
          {weekdayName(day.weekday)}: {status}
        </span>
      </span>
    </li>
  );
}

const CHART = { width: 320, height: 140, bar: 26, top: 16, bottom: 24 };

function WeeksChart({ progress: p }: { progress: Progress }) {
  const max = Math.max(7, ...p.lastWeeks.map((w) => w.trained));
  const plot = CHART.height - CHART.top - CHART.bottom;
  const step = CHART.width / p.lastWeeks.length;
  const y = (value: number) => CHART.top + plot - (value / max) * plot;

  return (
    <Card>
      <h2 className="text-lg font-bold">Últimas 8 semanas</h2>
      <p className="text-sm text-muted">Días entrenados por semana</p>
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="mt-3 w-full text-accent"
        aria-hidden="true"
      >
        {p.plannedPerWeek > 0 && (
          <line
            x1={0}
            x2={CHART.width}
            y1={y(p.plannedPerWeek)}
            y2={y(p.plannedPerWeek)}
            stroke="currentColor"
            strokeDasharray="4 4"
            opacity={0.5}
          />
        )}
        {p.lastWeeks.map((w, i) => {
          const x = i * step + (step - CHART.bar) / 2;
          const top = y(w.trained);
          return (
            <g key={w.start}>
              <rect
                x={x}
                y={top}
                width={CHART.bar}
                height={Math.max(0, CHART.top + plot - top)}
                rx={6}
                fill="currentColor"
                opacity={i === p.lastWeeks.length - 1 ? 1 : 0.7}
              />
              <text
                x={x + CHART.bar / 2}
                y={top - 4}
                textAnchor="middle"
                className="fill-text text-[11px] font-bold"
              >
                {w.trained}
              </text>
              <text
                x={x + CHART.bar / 2}
                y={CHART.height - 6}
                textAnchor="middle"
                className="fill-muted text-[10px]"
              >
                {shortDate(w.start)}
              </text>
            </g>
          );
        })}
      </svg>
      {p.plannedPerWeek > 0 && (
        <p className="mt-2 text-sm text-muted">
          La línea discontinua es tu objetivo: {p.plannedPerWeek}{" "}
          {p.plannedPerWeek === 1 ? "día" : "días"} por semana.
        </p>
      )}
      <ul className="sr-only">
        {p.lastWeeks.map((w) => (
          <li key={w.start}>
            Semana del {shortDate(w.start)}: {w.trained} {w.trained === 1 ? "día" : "días"}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ClassesCard({ progress: p }: { progress: Progress }) {
  const total = p.classesThisMonth.reduce((sum, c) => sum + c.count, 0);
  return (
    <Card>
      <h2 className="text-lg font-bold">Clases este mes</h2>
      {total === 0 ? (
        <p className="mt-1 text-muted">Todavía ninguna. Márcalas como hechas en Hoy.</p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
            {total} {total === 1 ? "clase" : "clases"}
          </p>
          <ul className="mt-3 space-y-2">
            {p.classesThisMonth.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="font-bold tabular-nums">× {c.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
