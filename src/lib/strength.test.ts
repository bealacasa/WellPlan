import { describe, expect, it } from "vitest";
import { bestKg, personalRecords, strengthGains } from "./strength";

const TODAY = new Date(2026, 9, 16, 12); // 16/10/2026: hace 3 meses ≈ 16/07

const exercise = (id: string, name: string, type = "maquina" as const) => ({
  id,
  name,
  type,
  deletedAt: null,
});
let n = 0;
const log = (
  exerciseId: string,
  date: string,
  kg: number | null,
  deletedAt: string | null = null,
) => ({
  id: `l${++n}`,
  exerciseId,
  date,
  kg,
  createdAt: `${date}T10:00:${String(n % 60).padStart(2, "0")}Z`,
  deletedAt,
});

describe("strengthGains", () => {
  it("compara el peso de hace 3 meses (o el primero) con el de ahora", () => {
    const exercises = [
      exercise("p", "Prensa"),
      exercise("r", "Remo"),
      exercise("g", "Puente", "peso_corporal" as never),
      exercise("s", "Sentadilla"),
    ];
    const logs = [
      log("p", "2026-06-01", 15),
      log("p", "2026-07-10", 20), // último antes de hace 3 meses → punto de partida
      log("p", "2026-08-20", 25),
      log("p", "2026-10-14", 32.5),
      log("r", "2026-09-30", 30), // empezó hace poco: se compara con el primero
      log("r", "2026-10-15", 27.5),
      log("g", "2026-09-01", 10), // sin kilos por tipo: no cuenta
      log("g", "2026-10-01", 20),
      log("s", "2026-10-15", 40), // un solo día: nada que comparar
    ];
    expect(strengthGains(exercises, logs, TODAY)).toEqual([
      {
        id: "p",
        name: "Prensa",
        type: "maquina",
        fromKg: 20,
        fromDate: "2026-07-10",
        toKg: 32.5,
        toDate: "2026-10-14",
        percent: 63,
      },
      expect.objectContaining({ id: "r", fromKg: 30, toKg: 27.5, percent: -8 }),
    ]);
  });
});

describe("personalRecords", () => {
  it("guarda el primer día con el mejor peso y lo que superó; sin borrados", () => {
    const exercises = [exercise("p", "Prensa"), exercise("r", "Remo"), exercise("x", "Curl")];
    const logs = [
      log("p", "2026-09-01", 20),
      log("p", "2026-09-08", 25),
      log("p", "2026-10-06", 30),
      log("p", "2026-10-13", 30), // repetir el récord no lo mueve
      log("p", "2026-10-14", 40, "2026-10-14T11:00:00Z"), // borrado
      log("r", "2026-10-01", 30),
      log("r", "2026-10-08", 30), // nunca ha superado nada
      log("x", "2026-10-02", 10),
      log("x", "2026-10-09", 12),
    ];
    const records = personalRecords(exercises, logs);
    expect(records.map((r) => [r.name, r.kg, r.date, r.previousKg])).toEqual([
      ["Curl", 12, "2026-10-09", 10],
      ["Prensa", 30, "2026-10-06", 25],
    ]);
    expect(bestKg(logs.filter((l) => l.exerciseId === "r"))).toBe(30);
    expect(bestKg([{ kg: null }])).toBeNull();
  });
});
