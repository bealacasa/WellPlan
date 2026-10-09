import type { Exercise, GymClass, PlanEntry, WeightLog } from "@/db/types";
import { addDays, isoWeekday, localDateKey } from "./dates";
import { feelingSummary, logSummary, shortDate } from "./labels";
import { hadDiscomfort } from "./progression";

/*
 * Informe para el fisio: qué se ha hecho en las últimas semanas, cómo ha evolucionado y,
 * sobre todo, las molestias. Funciones puras: se calcula a partir de los datos locales.
 */

export type ExerciseReport = {
  name: string;
  /** Días distintos en que se ha hecho. */
  times: number;
  /** Primer y último registro del periodo ("20 kg · 3 × 12"). */
  first: string;
  last: string;
  /** Sensación media (0–10) de los registros valorados, o null. */
  avgFeeling: number | null;
  notes: { date: string; text: string }[];
};

export type Discomfort = {
  date: string;
  exercise: string;
  detail: string;
  note: string | null;
};

export type Report = {
  from: string;
  to: string;
  trainedDays: number;
  /** Días del periodo con algo planificado (según el plan y el horario actuales). */
  plannedDays: number;
  exercises: ExerciseReport[];
  discomforts: Discomfort[];
};

type Data = {
  exercises: Exercise[];
  logs: WeightLog[];
  entries: PlanEntry[];
  classes: GymClass[];
};

const alive = <T extends { deletedAt: string | null }>(r: T) => r.deletedAt === null;

export function buildReport(data: Data, today: Date, weeks: number): Report {
  const fromDate = addDays(today, -7 * weeks + 1);
  const from = localDateKey(fromDate);
  const to = localDateKey(today);
  const exerciseById = new Map(data.exercises.filter(alive).map((e) => [e.id, e]));
  const logs = data.logs
    .filter((l) => alive(l) && l.date >= from && l.date <= to && exerciseById.has(l.exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  const plannedWeekdays = new Set([
    ...data.entries.filter(alive).map((e) => e.weekday),
    ...data.classes.filter((c) => alive(c) && c.attending).map((c) => c.weekday),
  ]);
  let plannedDays = 0;
  for (let d = fromDate; localDateKey(d) <= to; d = addDays(d, 1)) {
    if (plannedWeekdays.has(isoWeekday(d))) plannedDays++;
  }

  const byExercise = new Map<string, WeightLog[]>();
  for (const log of logs) {
    byExercise.set(log.exerciseId, [...(byExercise.get(log.exerciseId) ?? []), log]);
  }
  const exercises: ExerciseReport[] = [...byExercise].map(([id, list]) => {
    const exercise = exerciseById.get(id) as Exercise;
    const rated = list.filter((l) => l.feeling !== null);
    const firstLog = list[0] as WeightLog;
    const lastLog = list.at(-1) as WeightLog;
    return {
      name: exercise.name,
      times: new Set(list.map((l) => l.date)).size,
      first: logSummary(firstLog, exercise.type),
      last: logSummary(lastLog, exercise.type),
      avgFeeling:
        rated.length > 0
          ? Math.round((rated.reduce((s, l) => s + (l.feeling ?? 0), 0) / rated.length) * 10) / 10
          : null,
      notes: list.filter((l) => l.note).map((l) => ({ date: l.date, text: l.note ?? "" })),
    };
  });
  exercises.sort((a, b) => b.times - a.times || a.name.localeCompare(b.name, "es"));

  const discomforts = logs.filter(hadDiscomfort).map((l) => ({
    date: l.date,
    exercise: exerciseById.get(l.exerciseId)?.name ?? "",
    detail: feelingSummary(l) ?? "",
    note: l.note,
  }));

  return {
    from,
    to,
    trainedDays: new Set(logs.map((l) => l.date)).size,
    plannedDays,
    exercises,
    discomforts,
  };
}

const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export const feelingLabel = (value: number) => `${decimal.format(value)}/10`;

/** Versión en texto, para mandarla por WhatsApp o correo. */
export function reportText(r: Report): string {
  const lines = [
    `Informe WellPlan · ${shortDate(r.from)} – ${shortDate(r.to)}`,
    r.plannedDays > 0
      ? `Días entrenados: ${r.trainedDays} de ${r.plannedDays} planificados`
      : `Días entrenados: ${r.trainedDays}`,
    "",
    "Molestias:",
    ...(r.discomforts.length === 0
      ? ["· Ninguna"]
      : r.discomforts.map(
          (d) =>
            `· ${shortDate(d.date)} · ${d.exercise} · ${d.detail}${d.note ? ` · «${d.note}»` : ""}`,
        )),
    "",
    "Por ejercicio:",
    ...r.exercises.flatMap((e) => [
      `· ${e.name}: ${e.times} ${e.times === 1 ? "vez" : "veces"} · ${
        e.first === e.last ? e.last : `${e.first} → ${e.last}`
      }${e.avgFeeling !== null ? ` · sensación media ${feelingLabel(e.avgFeeling)}` : ""}`,
      ...e.notes.map((n) => `   ${shortDate(n.date)}: ${n.text}`),
    ]),
  ];
  return lines.join("\n");
}
