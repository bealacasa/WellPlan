import { beforeEach, describe, expect, it } from "vitest";
import { progressWidth } from "@/pages/TodayPage";
import { db } from "../database";
import { createExercise, deleteExercise } from "./exercises";
import { addToDay } from "./plan";
import { createSession } from "./sessions";
import { getTodayPlan } from "./today";
import { addLog } from "./weightLogs";

const exercise = (name: string, type: "maquina" | "clase" = "maquina") =>
  createExercise({
    name,
    type,
    physioNotes: "",
    sets: type === "clase" ? 1 : 3,
    reps: type === "clase" ? null : 12,
    durationSec: type === "clase" ? 3600 : null,
    targetKg: null,
  });

// Jueves 8 de octubre de 2026, a mediodía (hora local).
const THURSDAY = new Date(2026, 9, 8, 12);

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("pantalla Hoy", () => {
  it("muestra las sesiones del día de la semana, en orden, con lo hecho hoy", async () => {
    const [prensa, pilates, remo] = [
      await exercise("Prensa"),
      await exercise("Pilates", "clase"),
      await exercise("Remo"),
    ];
    const pierna = await createSession({ name: "Pierna", exerciseIds: [remo, prensa] });
    const clase = await createSession({ name: "Clase", exerciseIds: [pilates] });
    await addToDay(4, pierna); // jueves
    await addToDay(4, clase);
    await addToDay(1, clase); // lunes: no debe salir
    await addLog(prensa, { date: "2026-10-08", kg: 40, sets: 3, reps: 12, note: null });
    await addLog(remo, { date: "2026-10-07", kg: 20, sets: 3, reps: 12, note: null }); // ayer

    const plan = await getTodayPlan(THURSDAY);
    expect(plan.sessions.map((s) => s.session.name)).toEqual(["Pierna", "Clase"]);
    expect(plan.sessions[0]!.exercises.map((e) => e.name)).toEqual(["Remo", "Prensa"]);
    expect([...plan.done]).toEqual([prensa]);
  });

  it("ignora ejercicios borrados y avisa si aún no hay nada creado", async () => {
    let plan = await getTodayPlan(THURSDAY);
    expect(plan).toMatchObject({ sessions: [], hasExercises: false, hasSessions: false });

    const a = await exercise("A");
    const b = await exercise("B");
    const s = await createSession({ name: "S", exerciseIds: [a, b] });
    await addToDay(4, s);
    await deleteExercise(a);
    plan = await getTodayPlan(THURSDAY);
    expect(plan.sessions[0]!.exercises.map((e) => e.name)).toEqual(["B"]);
  });
});

describe("barra de progreso", () => {
  it("redondea al 10 % y se mantiene en 0–100", () => {
    expect(progressWidth(0)).toBe("w-0");
    expect(progressWidth(34)).toBe("w-3/10");
    expect(progressWidth(66)).toBe("w-7/10");
    expect(progressWidth(100)).toBe("w-full");
    expect(progressWidth(150)).toBe("w-full");
    expect(progressWidth(-5)).toBe("w-0");
  });
});
