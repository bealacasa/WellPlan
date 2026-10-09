import type { Exercise, ExerciseType, WeightLog } from "@/db/types";
import { formatDuration, formatKg, formatPace, paceSecPerKm } from "./numbers";

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  maquina: "Máquina",
  peso_libre: "Peso libre",
  peso_corporal: "Peso corporal",
  estiramiento: "Estiramiento",
  clase: "Clase",
  cardio: "Cardio",
};

/** Tipos en los que se trabaja por duración en vez de por repeticiones. */
export const usesDuration = (type: ExerciseType) => type === "estiramiento" || type === "clase";
/** Las clases se miden en minutos y sin series; los estiramientos, en segundos. */
export const isClass = (type: ExerciseType) => type === "clase";
/** Cardio (correr, bici, elíptica…): distancia, tiempo, esfuerzo e intervalos CaCo. */
export const isCardio = (type: ExerciseType) => type === "cardio";

const minSec = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}′` : m === 0 ? `${s}″` : `${m}′${s}″`;
};

/** "8 × (2′ correr + 1′ andar)" */
export function intervalLabel(
  e: Pick<Exercise, "intervalRunSec" | "intervalWalkSec" | "intervalRounds">,
): string | null {
  if (e.intervalRunSec === null || e.intervalWalkSec === null || e.intervalRounds === null) {
    return null;
  }
  const walk = e.intervalWalkSec > 0 ? ` + ${minSec(e.intervalWalkSec)} andar` : "";
  return `${e.intervalRounds} × (${minSec(e.intervalRunSec)} correr${walk})`;
}
/** Tipos en los que tiene sentido registrar kilos. */
export const usesKg = (type: ExerciseType) => type === "maquina" || type === "peso_libre";

/** "3 × 12 · 20 kg", "2 × 30 s" o "60 min" (clases) */
export function targetLabel(
  e: Pick<
    Exercise,
    | "type"
    | "sets"
    | "reps"
    | "durationSec"
    | "targetKg"
    | "targetDistanceKm"
    | "intervalRunSec"
    | "intervalWalkSec"
    | "intervalRounds"
  >,
) {
  if (isClass(e.type)) return `${Math.round((e.durationSec ?? 0) / 60)} min`;
  if (isCardio(e.type)) {
    const parts = [
      e.targetDistanceKm !== null ? `${formatKg(e.targetDistanceKm)} km` : null,
      e.durationSec !== null ? `${Math.round(e.durationSec / 60)} min` : null,
      intervalLabel(e),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Libre";
  }
  const work = e.durationSec ? `${e.durationSec} s` : `${e.reps ?? "?"}`;
  const kg = e.targetKg !== null ? ` · ${formatKg(e.targetKg)} kg` : "";
  return `${e.sets} × ${work}${kg}`;
}

const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

/** "2026-10-09" → "9 oct" (sin desfases de zona horaria). */
export function shortDate(key: string): string {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return dateFormat.format(new Date(y, m - 1, d));
}

/** Resumen de un registro para el historial ("40 kg · 3 × 12", "5 km · 32:45 · 6:33 /km · RPE 7"). */
export function logSummary(
  log: Pick<WeightLog, "kg" | "sets" | "reps" | "distanceKm" | "durationSec" | "effort">,
  type: ExerciseType,
): string {
  if (isCardio(type)) {
    const pace = paceSecPerKm(log.distanceKm, log.durationSec);
    const parts = [
      log.distanceKm !== null ? `${formatKg(log.distanceKm)} km` : null,
      log.durationSec !== null ? formatDuration(log.durationSec) : null,
      pace !== null ? formatPace(pace) : null,
      log.effort !== null ? `esfuerzo ${log.effort}/10` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Hecho";
  }
  if (isClass(type)) return "Hecha";
  const kg = log.kg !== null ? `${formatKg(log.kg)} kg · ` : "";
  const work = log.durationSec !== null ? `${log.durationSec} s` : (log.reps ?? "—");
  return `${kg}${log.sets} × ${work}`;
}

/** "Sensación 7/10 · molestia en rodilla" (o null si no se valoró nada). */
export function feelingSummary(log: Pick<WeightLog, "feeling" | "painArea">): string | null {
  const parts = [
    log.feeling !== null ? `Sensación ${log.feeling}/10` : null,
    log.painArea !== null ? `molestia en ${log.painArea.toLowerCase()}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
