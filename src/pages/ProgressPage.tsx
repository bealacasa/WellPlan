import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { TYPE_STYLE } from "@/components/typeStyle";
import { Card, EmptyState, PageHeader, buttonSecondary } from "@/components/ui";
import {
  streakLabel,
  useProgress,
  weekSummary,
  type DayStatus,
  type Progress,
} from "@/db/repositories/progress";
import { addDays, isoWeekday, localDateKey, weekdayName, weekdayShort } from "@/lib/dates";
import { shortDate } from "@/lib/labels";
import { formatKg } from "@/lib/numbers";
import { GAIN_MONTHS } from "@/lib/strength";

/** Progreso: esta semana, racha, calendario, últimas 8 semanas, fuerza y lo hecho este mes. */
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
          <MonthCalendar progress={progress} />
          <WeeksChart progress={progress} />
          <GainsCard progress={progress} />
          <RecordsCard progress={progress} />
          <ClassesCard progress={progress} />
          <ExercisesCard progress={progress} />
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
    <li>
      <Link
        to={`/progreso/dia/${day.date}`}
        className="flex flex-col items-center gap-1 rounded-xl py-1 active:scale-95"
      >
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
            {weekdayName(day.weekday)}: {status}. Ver lo que hiciste
          </span>
        </span>
      </Link>
    </li>
  );
}

const monthFormat = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });

/** Calendario de un mes: días entrenados, planificados sin hacer y hoy. Se puede ir hacia atrás. */
function MonthCalendar({ progress: p }: { progress: Progress }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const todayKey = localDateKey(now);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
  const monthKey = localDateKey(first).slice(0, 7);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(first, i));
  const trained = days.filter((d) => p.trainedDates.has(localDateKey(d))).length;
  const canGoBack = p.firstDate !== null && p.firstDate.slice(0, 7) < monthKey;
  const label = monthFormat.format(first).replace(" de ", " ");

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold capitalize">{label}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setOffset(offset - 1)}
            disabled={!canGoBack}
            aria-label="Mes anterior"
            className="grid size-12 place-items-center rounded-xl bg-surface-2 text-xl font-bold disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setOffset(offset + 1)}
            disabled={offset >= 0}
            aria-label="Mes siguiente"
            className="grid size-12 place-items-center rounded-xl bg-surface-2 text-xl font-bold disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>
      <p className="text-3xl font-extrabold tracking-tight tabular-nums">
        {trained} {trained === 1 ? "día" : "días"}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <span key={d} className="text-xs font-bold text-muted">
            {weekdayShort(d)}
          </span>
        ))}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-1" aria-label={`Días de ${label}`}>
        {days.map((date, i) => {
          const key = localDateKey(date);
          const isTrained = p.trainedDates.has(key);
          const isFuture = key > todayKey;
          const planned = p.isPlanned(date);
          const status = isTrained
            ? "entrenado"
            : planned
              ? isFuture
                ? "planificado"
                : "planificado, sin hacer"
              : "descanso";
          return (
            <li key={key} className={i === 0 ? CALENDAR_START[isoWeekday(date) - 1] : undefined}>
              <Link
                to={`/progreso/dia/${key}`}
                className={`grid aspect-square min-h-10 place-items-center rounded-full text-sm font-bold tabular-nums active:scale-95 ${
                  isTrained
                    ? "bg-linear-to-br from-accent to-accent-2 text-accent-contrast"
                    : planned
                      ? "border-2 border-dashed border-accent"
                      : isFuture
                        ? "text-muted"
                        : "bg-surface-2"
                } ${key === todayKey ? "ring-2 ring-text ring-offset-2 ring-offset-surface" : ""}`}
              >
                <span aria-hidden="true">{date.getDate()}</span>
                <span className="sr-only">
                  {date.getDate()} de {label}
                  {key === todayKey ? " (hoy)" : ""}: {status}. Ver lo que hiciste
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted">
        Relleno: entrenado. Discontinuo: tocaba según tu plan. Toca un día para ver qué hiciste.
      </p>
    </Card>
  );
}

/** Columna del primer día del mes (lunes = 1). Clases completas para que Tailwind las genere. */
const CALENDAR_START = [
  "col-start-1",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
];

const PREVIEW = 5;

/** "Ver todos (8)" / "Ver menos", si la lista es larga. */
function ShowAll({
  total,
  open,
  onToggle,
}: {
  total: number;
  open: boolean;
  onToggle: () => void;
}) {
  if (total <= PREVIEW) return null;
  return (
    <button type="button" onClick={onToggle} className={`${buttonSecondary} mt-3 w-full`}>
      {open ? "Ver menos" : `Ver todos (${total})`}
    </button>
  );
}

const signedPercent = (percent: number) =>
  `${percent > 0 ? "+" : percent < 0 ? "−" : ""}${Math.abs(percent)} %`;

/** Lo que has subido: peso de hace unos meses (o del principio) frente al de ahora. */
function GainsCard({ progress: p }: { progress: Progress }) {
  const [open, setOpen] = useState(false);
  const up = p.gains.filter((g) => g.toKg > g.fromKg).length;
  return (
    <Card>
      <h2 className="text-lg font-bold">Lo que has subido</h2>
      <p className="text-sm text-muted">
        Peso de hace {GAIN_MONTHS} meses (o del primer día) frente al de ahora.
      </p>
      {p.gains.length === 0 ? (
        <p className="mt-2 text-muted">
          Registra los kilos de tus ejercicios en dos días distintos para ver cuánto subes.
        </p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
            {up} de {p.gains.length} {p.gains.length === 1 ? "ejercicio" : "ejercicios"}
          </p>
          <ul className="mt-3 space-y-2">
            {(open ? p.gains : p.gains.slice(0, PREVIEW)).map((g) => (
              <li key={g.id}>
                <Link
                  to={`/ejercicios/${g.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2 active:scale-[0.99]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{g.name}</span>
                    <span className="block text-sm text-muted tabular-nums">
                      {formatKg(g.fromKg)} →{" "}
                      <strong className="text-text">{formatKg(g.toKg)} kg</strong> · desde el{" "}
                      {shortDate(g.fromDate)}
                    </span>
                  </span>
                  {g.percent !== null && (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 font-bold tabular-nums ${
                        g.percent > 0 ? "bg-accent-soft text-accent" : "bg-surface text-muted"
                      }`}
                    >
                      {signedPercent(g.percent)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
          <ShowAll total={p.gains.length} open={open} onToggle={() => setOpen(!open)} />
        </>
      )}
    </Card>
  );
}

/** Récords: el mejor peso de cada ejercicio; los de este mes, con medalla de "Nuevo". */
function RecordsCard({ progress: p }: { progress: Progress }) {
  const [open, setOpen] = useState(false);
  const month = localDateKey(new Date()).slice(0, 7);
  const newThisMonth = p.records.filter((r) => r.date.startsWith(month)).length;
  return (
    <Card>
      <h2 className="text-lg font-bold">Récords</h2>
      {p.records.length === 0 ? (
        <p className="mt-1 text-muted">
          Cuando levantes más peso que nunca en un ejercicio, aparecerá aquí con su medalla.
        </p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
            {newThisMonth > 0
              ? `${newThisMonth} ${newThisMonth === 1 ? "nuevo" : "nuevos"} este mes`
              : `${p.records.length} ${p.records.length === 1 ? "récord" : "récords"}`}
          </p>
          <ul className="mt-3 space-y-2">
            {(open ? p.records : p.records.slice(0, PREVIEW)).map((r) => {
              const isNew = r.date.startsWith(month);
              return (
                <li key={r.id}>
                  <Link
                    to={`/ejercicios/${r.id}`}
                    className="flex min-h-14 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2 active:scale-[0.99]"
                  >
                    <span aria-hidden="true" className="text-2xl">
                      🏅
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {r.name}
                        {isNew && (
                          <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-contrast">
                            Nuevo
                          </span>
                        )}
                      </span>
                      <span className="block text-sm text-muted">
                        {shortDate(r.date)} · antes {formatKg(r.previousKg ?? 0)} kg
                      </span>
                    </span>
                    <span className="shrink-0 text-lg font-extrabold tabular-nums">
                      {formatKg(r.kg)} kg
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <ShowAll total={p.records.length} open={open} onToggle={() => setOpen(!open)} />
        </>
      )}
    </Card>
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
                {i === p.lastWeeks.length - 1 ? "Esta sem." : shortDate(w.start)}
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
        {p.lastWeeks.map((w, i) => (
          <li key={w.start}>
            {i === p.lastWeeks.length - 1
              ? "Esta semana (hasta hoy)"
              : `Semana del ${shortDate(w.start)}`}
            : {w.trained} {w.trained === 1 ? "día" : "días"}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Ejercicios hechos este mes (días distintos), con enlace a su ficha e historial. */
function ExercisesCard({ progress: p }: { progress: Progress }) {
  const total = p.exercisesThisMonth.length;
  return (
    <Card>
      <h2 className="text-lg font-bold">Ejercicios este mes</h2>
      {total === 0 ? (
        <p className="mt-1 text-muted">Todavía ninguno. Regístralos en Hoy o en su ficha.</p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
            {total} {total === 1 ? "ejercicio" : "ejercicios"}
          </p>
          <ul className="mt-3 space-y-2">
            {p.exercisesThisMonth.map((e) => {
              const style = TYPE_STYLE[e.type];
              return (
                <li key={e.id}>
                  <Link
                    to={`/ejercicios/${e.id}`}
                    className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 active:scale-[0.99]"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${style.tile}`}
                    >
                      <style.Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 font-semibold">{e.name}</span>
                    <span className="font-bold tabular-nums">
                      × {e.count} <span aria-hidden="true">›</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm text-muted">
            Días que has hecho cada uno. Toca uno para ver su historial.
          </p>
        </>
      )}
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
              <li key={c.id}>
                <Link
                  to={`/progreso/clase/${c.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3 active:scale-[0.99]"
                >
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-bold tabular-nums">
                    × {c.count} <span aria-hidden="true">›</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">Toca una clase para corregir los días.</p>
        </>
      )}
      {p.allClasses.some((c) => !p.classesThisMonth.some((m) => m.id === c.id)) && (
        <ClassPicker progress={p} />
      )}
    </Card>
  );
}

/** Apuntar una clase que no aparece este mes (p. ej. se te olvidó marcarla). */
function ClassPicker({ progress: p }: { progress: Progress }) {
  const navigate = useNavigate();
  const others = p.allClasses.filter((c) => !p.classesThisMonth.some((m) => m.id === c.id));
  return (
    <div className="mt-3">
      <label htmlFor="other-class" className="sr-only">
        Apuntar otra clase
      </label>
      <select
        id="other-class"
        value=""
        onChange={(e) => e.target.value && navigate(`/progreso/clase/${e.target.value}`)}
        className="min-h-12 w-full rounded-xl border border-dashed border-border bg-transparent px-3 font-medium"
      >
        <option value="">+ Apuntar otra clase…</option>
        {others.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
