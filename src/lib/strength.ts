import type { Exercise, ExerciseType, WeightLog } from "@/db/types";
import { addDays, localDateKey } from "./dates";
import { usesKg } from "./labels";

/*
 * Fuerza: cuánto has subido de peso y tus récords. Solo cuentan los ejercicios con kilos
 * (máquina y peso libre) y los registros con kilos apuntados.
 */

type ExerciseLike = Pick<Exercise, "id" | "name" | "type" | "deletedAt">;
type LogLike = Pick<WeightLog, "id" | "exerciseId" | "date" | "kg" | "createdAt" | "deletedAt">;
type KgLog = LogLike & { kg: number };

export type StrengthGain = {
  id: string;
  name: string;
  type: ExerciseType;
  fromKg: number;
  fromDate: string;
  toKg: number;
  toDate: string;
  /** Diferencia en % (redondeada); null si se partía de 0 kg. */
  percent: number | null;
};

export type PersonalRecord = {
  id: string;
  name: string;
  type: ExerciseType;
  kg: number;
  /** Primer día en que se levantó ese peso. */
  date: string;
  /** Id del registro del récord (para marcarlo en el historial). */
  logId: string;
  /** Peso anterior que se superó (null si es la única marca: no hay nada que batir). */
  previousKg: number | null;
};

/** Meses hacia atrás con los que se compara "lo que has subido". */
export const GAIN_MONTHS = 3;

const chronological = (a: LogLike, b: LogLike) =>
  a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);

/** Registros con kilos de cada ejercicio con kilos, del más antiguo al más reciente. */
function kgLogsByExercise(exercises: readonly ExerciseLike[], logs: readonly LogLike[]) {
  const byId = new Map(
    exercises.filter((e) => e.deletedAt === null && usesKg(e.type)).map((e) => [e.id, e]),
  );
  const grouped = new Map<string, KgLog[]>();
  for (const log of logs) {
    if (log.deletedAt !== null || log.kg === null || !byId.has(log.exerciseId)) continue;
    grouped.set(log.exerciseId, [...(grouped.get(log.exerciseId) ?? []), log as KgLog]);
  }
  return [...grouped].map(([id, list]) => ({
    exercise: byId.get(id) as ExerciseLike,
    logs: list.sort(chronological),
  }));
}

/**
 * Peso de hace `GAIN_MONTHS` meses (el último registro hasta esa fecha o, si empezaste
 * después, el primero) frente al de ahora (el último registro). De más a menos subida.
 */
export function strengthGains(
  exercises: readonly ExerciseLike[],
  logs: readonly LogLike[],
  today: Date,
): StrengthGain[] {
  const since = localDateKey(addDays(today, -Math.round(GAIN_MONTHS * 30.44)));
  return kgLogsByExercise(exercises, logs)
    .flatMap(({ exercise, logs: list }) => {
      const before = list.filter((l) => l.date <= since).at(-1) ?? list[0];
      const now = list.at(-1);
      // Hace falta al menos un día distinto para comparar.
      if (!before || !now || before.date === now.date) return [];
      return [
        {
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
          fromKg: before.kg,
          fromDate: before.date,
          toKg: now.kg,
          toDate: now.date,
          percent: before.kg > 0 ? Math.round(((now.kg - before.kg) / before.kg) * 100) : null,
        },
      ];
    })
    .sort(
      (a, b) =>
        (b.percent ?? Infinity) - (a.percent ?? Infinity) ||
        b.toKg - b.fromKg - (a.toKg - a.fromKg) ||
        a.name.localeCompare(b.name, "es"),
    );
}

/** Mejor peso de cada ejercicio (el primer día que lo levantaste). Los más recientes primero. */
export function personalRecords(
  exercises: readonly ExerciseLike[],
  logs: readonly LogLike[],
): PersonalRecord[] {
  return kgLogsByExercise(exercises, logs)
    .flatMap(({ exercise, logs: list }) => {
      const record = list.reduce((best, log) => (log.kg > best.kg ? log : best));
      const earlier = list.filter((l) => chronological(l, record) < 0);
      const previousKg = earlier.length > 0 ? Math.max(...earlier.map((l) => l.kg)) : null;
      // Solo es récord si superó algo (no lo es la primera vez ni repetir el mismo peso).
      if (previousKg === null || previousKg >= record.kg) return [];
      return [
        {
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
          kg: record.kg,
          date: record.date,
          logId: record.id,
          previousKg,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, "es"));
}

/** Mejor peso registrado hasta ahora (null si nunca se apuntaron kilos). */
export function bestKg(logs: readonly Pick<WeightLog, "kg">[]): number | null {
  const values = logs.flatMap((l) => (l.kg === null ? [] : [l.kg]));
  return values.length > 0 ? Math.max(...values) : null;
}
