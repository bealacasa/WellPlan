import { formatKg } from "@/lib/numbers";

const W = 320;
const H = 140;
const PAD = 12;

export type ChartDatum = { date: string; value: number | null };
export type ChartPoint = { x: number; y: number; value: number; date: string };

/**
 * Puntos del gráfico (en el espacio del SVG) a partir del historial: uno por día con el
 * valor máximo de ese día, ordenados por fecha. Sin librerías: es una simple polilínea.
 */
export function chartPoints(data: ChartDatum[]): ChartPoint[] {
  const byDay = new Map<string, number>();
  for (const { date, value } of data) {
    if (value === null) continue;
    byDay.set(date, Math.max(byDay.get(date) ?? 0, value));
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (days.length === 0) return [];
  const values = days.map(([, v]) => v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return days.map(([date, value], i) => ({
    date,
    value,
    x: days.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (days.length - 1),
    y: max === min ? H / 2 : H - PAD - ((value - min) * (H - 2 * PAD)) / span,
  }));
}

/** Evolución de kilos (fuerza) o de kilómetros (cardio). */
export function WeightChart({ data, unit }: { data: ChartDatum[]; unit: "kg" | "km" }) {
  const points = chartPoints(data);
  const first = points[0];
  const last = points.at(-1);
  if (points.length < 2 || !first || !last) return null;
  const what = unit === "kg" ? "del peso" : "de la distancia";
  const summary = `Evolución ${what}: de ${formatKg(first.value)} ${unit} a ${formatKg(last.value)} ${unit} en ${points.length} días.`;

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
        <span>
          {formatKg(first.value)} {unit}
        </span>
        <span>
          {formatKg(last.value)} {unit}
        </span>
      </figcaption>
    </figure>
  );
}
