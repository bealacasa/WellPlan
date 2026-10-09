import type { Exercise, ExerciseType } from "@/db/types";
import { formatKg } from "./numbers";

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  maquina: "Máquina",
  peso_libre: "Peso libre",
  peso_corporal: "Peso corporal",
  estiramiento: "Estiramiento",
  clase: "Clase",
};

/** Tipos en los que se trabaja por duración en vez de por repeticiones. */
export const usesDuration = (type: ExerciseType) => type === "estiramiento" || type === "clase";
/** Las clases se miden en minutos y sin series; los estiramientos, en segundos. */
export const isClass = (type: ExerciseType) => type === "clase";
/** Tipos en los que tiene sentido registrar kilos. */
export const usesKg = (type: ExerciseType) => type === "maquina" || type === "peso_libre";

/** "3 × 12 · 20 kg", "2 × 30 s" o "60 min" (clases) */
export function targetLabel(
  e: Pick<Exercise, "type" | "sets" | "reps" | "durationSec" | "targetKg">,
) {
  if (isClass(e.type)) return `${Math.round((e.durationSec ?? 0) / 60)} min`;
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
