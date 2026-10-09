import { describe, expect, it } from "vitest";
import type { Exercise, WeightLog } from "@/db/types";
import { buildReport, reportText } from "./report";

const sync = { createdAt: "", updatedAt: "", deletedAt: null, dirty: 0 as const };
const prensa: Exercise = {
  ...sync,
  id: "p",
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
};
let n = 0;
const log = (date: string, kg: number, over: Partial<WeightLog> = {}): WeightLog => ({
  ...sync,
  id: String(n++),
  createdAt: date + "T10:00:00Z",
  exerciseId: "p",
  date,
  kg,
  sets: 3,
  reps: 12,
  distanceKm: null,
  durationSec: null,
  effort: null,
  feeling: null,
  painArea: null,
  note: null,
  ...over,
});

// Viernes 9 de octubre de 2026: 4 semanas = del 12 de septiembre al 9 de octubre.
const TODAY = new Date(2026, 9, 9, 12);

describe("informe para el fisio", () => {
  it("resume días, evolución, sensación media y molestias del periodo", () => {
    const logs = [
      log("2026-09-01", 15), // fuera del periodo
      log("2026-09-15", 20, { feeling: 9 }),
      log("2026-09-29", 22.5, { feeling: 4, painArea: "Rodilla", note: "Pinchazo al bajar" }),
      log("2026-10-06", 25, { feeling: 8 }),
    ];
    const entries = [
      {
        ...sync,
        id: "e",
        weekday: 2,
        sessionId: null,
        exerciseId: "p",
        position: 0,
        targetDistanceKm: null,
        durationSec: null,
        intervalRunSec: null,
        intervalWalkSec: null,
        intervalRounds: null,
      },
    ];
    const r = buildReport({ exercises: [prensa], logs, entries, classes: [] }, TODAY, 4);
    expect(r.from).toBe("2026-09-12");
    expect(r.trainedDays).toBe(3);
    expect(r.plannedDays).toBe(4); // cuatro martes
    expect(r.exercises).toEqual([
      {
        name: "Prensa",
        times: 3,
        first: "20 kg · 3 × 12",
        last: "25 kg · 3 × 12",
        avgFeeling: 7,
        notes: [{ date: "2026-09-29", text: "Pinchazo al bajar" }],
      },
    ]);
    expect(r.discomforts).toEqual([
      {
        date: "2026-09-29",
        exercise: "Prensa",
        detail: "Sensación 4/10 · molestia en rodilla",
        note: "Pinchazo al bajar",
      },
    ]);
    const text = reportText(r);
    expect(text).toContain("Días entrenados: 3 de 4 planificados");
    expect(text).toContain(
      "· Prensa: 3 veces · 20 kg · 3 × 12 → 25 kg · 3 × 12 · sensación media 7/10",
    );
    expect(text).toContain("molestia en rodilla · «Pinchazo al bajar»");
  });
});
