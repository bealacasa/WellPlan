import type { WeightLog } from "@/db/types";
import { formatKg } from "@/lib/numbers";

const W = 320;
const H = 140;
const PAD = 12;

export type ChartPoint = { x: number; y: number; kg: number; date: string };

/**
 * Puntos del gráfico (en el espacio del SVG) a partir del historial: uno por día con el
 * mayor peso de ese día, ordenados por fecha. Sin librerías: es una simple polilínea.
 */
export function chartPoints(logs: Pick<WeightLog, "date" | "kg">[]): ChartPoint[] {
  const byDay = new Map<string, number>();
  for (const log of logs) {
    if (log.kg === null) continue;
    byDay.set(log.date, Math.max(byDay.get(log.date) ?? 0, log.kg));
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (days.length === 0) return [];
  const values = days.map(([, kg]) => kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return days.map(([date, kg], i) => ({
    date,
    kg,
    x: days.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (days.length - 1),
    y: max === min ? H / 2 : H - PAD - ((kg - min) * (H - 2 * PAD)) / span,
  }));
}

export function WeightChart({ logs }: { logs: Pick<WeightLog, "date" | "kg">[] }) {
  const points = chartPoints(logs);
  const first = points[0];
  const last = points.at(-1);
  if (points.length < 2 || !first || !last) return null;
  const summary = `Evolución del peso: de ${formatKg(first.kg)} kg a ${formatKg(last.kg)} kg en ${points.length} días.`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        className="h-36 w-full text-accent"
      >
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r={4} fill="currentColor" />
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted tabular-nums">
        <span>{formatKg(first.kg)} kg</span>
        <span>{formatKg(last.kg)} kg</span>
      </figcaption>
    </figure>
  );
}
