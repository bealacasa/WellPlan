import { describe, expect, it } from "vitest";
import type { Exercise } from "@/db/types";
import { quickLogInput, suggestNextKg, worseningFeeling } from "./progression";

const exercise = (over: Partial<Exercise> = {}): Exercise => ({
  id: "e",
  createdAt: "",
  updatedAt: "",
  deletedAt: null,
  dirty: 0,
  name: "Prensa",
  type: "maquina",
  photoId: null,
  physioNotes: "",
  sets: 3,
  reps: 12,
  durationSec: null,
  targetKg: 20,
  targetDistanceKm: null,
  intervalRunSec: null,
  intervalWalkSec: null,
  intervalRounds: null,
  ...over,
});
const log = (date: string, kg: number | null, sets = 3, reps: number | null = 12) => ({
  date,
  kg,
  sets,
  reps,
  durationSec: null,
});

describe("registro de un toque", () => {
  it("repite la última vez o, si no hay, usa el objetivo", () => {
    expect(quickLogInput(exercise(), log("2026-10-01", 22.5, 4, 10))).toMatchObject({
      kg: 22.5,
      sets: 4,
      reps: 10,
    });
    expect(quickLogInput(exercise(), null)).toMatchObject({ kg: 20, sets: 3, reps: 12 });
  });

  it("planchas por tiempo, clases y casos en los que hay que abrir la ficha", () => {
    const plank = exercise({ type: "peso_corporal", reps: null, durationSec: 30, targetKg: null });
    expect(quickLogInput(plank, null)).toMatchObject({ kg: null, reps: null, durationSec: 30 });
    expect(quickLogInput(exercise({ type: "clase", durationSec: 2700 }), null)).toMatchObject({
      sets: 1,
      durationSec: null,
    });
    expect(quickLogInput(exercise({ targetKg: null }), null)).toBeNull(); // sin kilos
    expect(quickLogInput(exercise({ type: "cardio" }), null)).toBeNull(); // datos reales
  });
});

describe("cuándo subir de peso", () => {
  it("sugiere +2,5 kg tras completar el objetivo dos días seguidos con el mismo peso", () => {
    expect(suggestNextKg(exercise(), [log("2026-10-08", 20), log("2026-10-06", 20)])).toBe(22.5);
    // Dos registros el mismo día cuentan como uno.
    expect(suggestNextKg(exercise(), [log("2026-10-08", 20), log("2026-10-08", 20)])).toBeNull();
  });

  it("no sugiere si faltaron repeticiones o series, o si el peso cambió", () => {
    expect(
      suggestNextKg(exercise(), [log("2026-10-08", 20, 3, 10), log("2026-10-06", 20)]),
    ).toBeNull();
    expect(suggestNextKg(exercise(), [log("2026-10-08", 20, 2), log("2026-10-06", 20)])).toBeNull();
    expect(suggestNextKg(exercise(), [log("2026-10-08", 22.5), log("2026-10-06", 20)])).toBeNull();
    expect(suggestNextKg(exercise(), [log("2026-10-08", 20)])).toBeNull();
  });

  it("solo en ejercicios con kilos y por repeticiones", () => {
    const logs = [log("2026-10-08", 20), log("2026-10-06", 20)];
    expect(suggestNextKg(exercise({ type: "peso_corporal" }), logs)).toBeNull();
    expect(suggestNextKg(exercise({ reps: null, durationSec: 30 }), logs)).toBeNull();
  });
});

describe("sensación y molestias", () => {
  it("el ✓ rápido guarda que fue bien, salvo si la última vez hubo molestias", () => {
    expect(quickLogInput(exercise(), log("2026-10-01", 20))).toMatchObject({
      feeling: 10,
      painArea: null,
    });
    expect(quickLogInput(exercise(), { ...log("2026-10-01", 20), feeling: 5 })).toBeNull();
    expect(quickLogInput(exercise(), { ...log("2026-10-01", 20), feeling: 6 })).not.toBeNull();
    expect(quickLogInput(exercise(), { ...log("2026-10-01", 20), painArea: "Rodilla" })).toBeNull();
  });

  it("no sugiere subir peso si hubo molestias", () => {
    const logs = [{ ...log("2026-10-08", 20), painArea: "Lumbar" }, log("2026-10-06", 20)];
    expect(suggestNextKg(exercise(), logs)).toBeNull();
  });

  it("avisa si la sensación baja tres veces seguidas", () => {
    const rated = (date: string, feeling: number | null) => ({ ...log(date, 20), feeling });
    expect(
      worseningFeeling([rated("2026-10-08", 5), rated("2026-10-06", 7), rated("2026-10-04", 9)]),
    ).toEqual([9, 7, 5]);
    // Sin valorar no cuenta; si se mantiene o mejora, no avisa.
    expect(
      worseningFeeling([
        rated("2026-10-09", null),
        rated("2026-10-08", 6),
        rated("2026-10-06", 7),
        rated("2026-10-04", 9),
      ]),
    ).toEqual([9, 7, 6]);
    expect(
      worseningFeeling([rated("2026-10-08", 7), rated("2026-10-06", 7), rated("2026-10-04", 9)]),
    ).toBeNull();
    expect(
      worseningFeeling([rated("2026-10-08", 8), rated("2026-10-06", 9), rated("2026-10-04", 10)]),
    ).toBeNull();
  });
});
