import type { Exercise, WeightLog } from "@/db/types";
import { isCardio, isClass, usesKg } from "./labels";
import { MAX_KG, stepKg } from "./numbers";

/** Lo mínimo de un registro que hace falta para decidir. */
type LogLike = Pick<WeightLog, "date" | "kg" | "sets" | "reps" | "durationSec">;

/** Valores de un registro rápido (todo lo de un registro salvo la fecha). */
export type QuickLogValues = Pick<
  WeightLog,
  "kg" | "sets" | "reps" | "durationSec" | "distanceKm" | "effort" | "note"
>;

/** Paso de subida sugerido (el mismo que los botones ±2,5 kg). */
export const PROGRESSION_STEP_KG = 2.5;

/**
 * Registro "igual que la última vez" (o, si nunca se ha hecho, según el objetivo del
 * ejercicio), sin la fecha. Devuelve null si no se puede registrar sin preguntar: cardio
 * (hay que meter la distancia y el tiempo reales) o falta un dato (kilos, repeticiones).
 */
export function quickLogInput(exercise: Exercise, last: LogLike | null): QuickLogValues | null {
  if (isCardio(exercise.type)) return null;
  const base = { distanceKm: null, effort: null, note: null };
  if (isClass(exercise.type)) {
    return { ...base, kg: null, sets: 1, reps: null, durationSec: null };
  }
  const kg = usesKg(exercise.type) ? (last?.kg ?? exercise.targetKg) : null;
  if (usesKg(exercise.type) && kg === null) return null;
  const sets = last?.sets ?? exercise.sets;
  // Por tiempo (planchas, estiramientos): segundos; si no, repeticiones.
  if (exercise.durationSec !== null) {
    return {
      ...base,
      kg,
      sets,
      reps: null,
      durationSec: last?.durationSec ?? exercise.durationSec,
    };
  }
  const reps = last?.reps ?? exercise.reps;
  if (reps === null) return null;
  return { ...base, kg, sets, reps, durationSec: null };
}

/**
 * Sobrecarga progresiva: si las dos últimas veces (días distintos) completaste las series
 * y repeticiones objetivo con el mismo peso, sugiere subir 2,5 kg. Solo para ejercicios
 * con kilos y por repeticiones. `logs`: del más reciente al más antiguo.
 */
export function suggestNextKg(exercise: Exercise, logs: readonly LogLike[]): number | null {
  if (!usesKg(exercise.type) || exercise.reps === null || exercise.durationSec !== null) {
    return null;
  }
  // El registro más reciente de cada uno de los dos últimos días.
  const lastTwo: LogLike[] = [];
  for (const log of logs) {
    if (lastTwo.some((l) => l.date === log.date)) continue;
    lastTwo.push(log);
    if (lastTwo.length === 2) break;
  }
  const [newest, previous] = lastTwo;
  if (!newest || !previous) return null;
  const kg = newest.kg;
  if (kg === null || kg + PROGRESSION_STEP_KG > MAX_KG) return null;
  const completed = (l: LogLike) =>
    l.kg === kg && l.sets >= exercise.sets && (l.reps ?? 0) >= (exercise.reps ?? Infinity);
  return completed(newest) && completed(previous) ? stepKg(kg, PROGRESSION_STEP_KG) : null;
}
