import { describe, expect, it } from "vitest";
import { chartPoints } from "@/components/WeightChart";
import { fitWithin, ImageError, processImage } from "./image";
import { shortDate, targetLabel } from "./labels";
import { formatKg, parseKg, stepKg } from "./numbers";
import { exerciseInputSchema, weightLogInputSchema } from "./validation";

describe("kilos", () => {
  it("acepta coma o punto decimal", () => {
    expect(parseKg("22,5")).toBe(22.5);
    expect(parseKg(" 22.5 ")).toBe(22.5);
    expect(parseKg("100")).toBe(100);
  });

  it("rechaza textos raros, negativos o excesivos", () => {
    for (const bad of ["", "abc", "-5", "22,555", "501", "1e3", "22,5kg"]) {
      expect(parseKg(bad), bad).toBeNull();
    }
  });

  it("formatea en español y suma o resta 2,5 sin pasarse", () => {
    expect(formatKg(22.5)).toBe("22,5");
    expect(stepKg(20, 2.5)).toBe(22.5);
    expect(stepKg(1, -2.5)).toBe(0);
    expect(stepKg(499, 2.5)).toBe(500);
  });
});

describe("imágenes", () => {
  it("reduce el lado mayor sin ampliar nunca", () => {
    expect(fitWithin(4032, 3024, 1200)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(3024, 4032, 240)).toEqual({ width: 180, height: 240 });
    expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 });
  });

  it("rechaza archivos que no son imágenes o demasiado grandes", async () => {
    await expect(processImage(new File(["x"], "a.txt", { type: "text/plain" }))).rejects.toThrow(
      ImageError,
    );
    const huge = new File([new Uint8Array(26 * 1024 * 1024)], "a.jpg", { type: "image/jpeg" });
    await expect(processImage(huge)).rejects.toThrow("demasiado grande");
  });
});

describe("validación", () => {
  const base = {
    name: "Prensa",
    type: "maquina" as const,
    physioNotes: "",
    sets: 3,
    reps: 12,
    durationSec: null,
    targetKg: 20,
  };

  it("acepta un ejercicio válido y exige repeticiones o duración", () => {
    expect(exerciseInputSchema.safeParse(base).success).toBe(true);
    expect(exerciseInputSchema.safeParse({ ...base, reps: null }).success).toBe(false);
  });

  it("aplica los mismos límites que la base de datos", () => {
    expect(exerciseInputSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, sets: 21 }).success).toBe(false);
    expect(exerciseInputSchema.safeParse({ ...base, targetKg: 600 }).success).toBe(false);
  });

  it("convierte una nota vacía en null", () => {
    const log = weightLogInputSchema.parse({
      date: "2026-10-09",
      kg: 20,
      sets: 3,
      reps: 10,
      note: "  ",
    });
    expect(log.note).toBeNull();
  });
});

describe("etiquetas", () => {
  it("objetivo y fechas", () => {
    expect(targetLabel({ sets: 3, reps: 12, durationSec: null, targetKg: 22.5 })).toBe(
      "3 × 12 · 22,5 kg",
    );
    expect(targetLabel({ sets: 2, reps: null, durationSec: 30, targetKg: null })).toBe("2 × 30 s");
    expect(shortDate("2026-10-09")).toMatch(/^9 oct/);
  });
});

describe("gráfico de evolución", () => {
  it("un punto por día (el peso máximo), ordenado y dentro del lienzo", () => {
    const points = chartPoints([
      { date: "2026-10-08", kg: 22.5 },
      { date: "2026-10-01", kg: 20 },
      { date: "2026-10-08", kg: 25 },
      { date: "2026-10-05", kg: null },
    ]);
    expect(points.map((p) => [p.date, p.kg])).toEqual([
      ["2026-10-01", 20],
      ["2026-10-08", 25],
    ]);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
    expect(points[1]!.y).toBeLessThan(points[0]!.y); // más peso = más arriba
  });
});
