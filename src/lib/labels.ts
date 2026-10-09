import type { Exercise, ExerciseType } from "@/db/types";
import { formatKg } from "./numbers";

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  maquina: "Máquina",
  peso_libre: "Peso libre",
  peso_corporal: "Peso corporal",
  estiramiento: "Estiramiento",
};

/** Tipos en los que se trabaja por duración en vez de por repeticiones. */
export const usesDuration = (type: ExerciseType) => type === "estiramiento";
/** Tipos en los que tiene sentido registrar kilos. */
export const usesKg = (type: ExerciseType) => type === "maquina" || type === "peso_libre";

/** "3 × 12 · 20 kg" o "2 × 30 s" */
export function targetLabel(e: Pick<Exercise, "sets" | "reps" | "durationSec" | "targetKg">) {
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
