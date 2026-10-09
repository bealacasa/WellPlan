import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../database";
import { createExercise } from "./exercises";
import { createGymClasses, setAttending } from "./gymClasses";
import { addToDay } from "./plan";
import { getProgress } from "./progress";
import { addLog } from "./weightLogs";

// Miércoles 14 de octubre de 2026 (semana del lunes 12).
const WEDNESDAY = new Date(2026, 9, 14, 12);

const strength = () =>
  createExercise({
    name: "Prensa",
    type: "maquina",
    physioNotes: "",
    sets: 3,
    reps: 12,
    durationSec: null,
    targetKg: null,
  });
const log = (exerciseId: string, date: string) =>
  addLog(exerciseId, { date, kg: 20, sets: 3, reps: 12, note: null });

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("progreso", () => {
  it("semana, racha y últimas semanas según el plan actual", async () => {
    const prensa = await strength();
    await addToDay(1, { exerciseId: prensa }); // lunes
    const [yoga] = await createGymClasses(
      { name: "Yoga", startTime: "18:00", durationMin: 45, room: "", instructor: "" },
      [3],
    );
    await setAttending(yoga!, true); // miércoles → 2 días planificados

    // Semanas anteriores: 2 días (cumplida), 2 días (cumplida), 1 día (no cumplida).
    for (const d of ["2026-10-05", "2026-10-07", "2026-09-28", "2026-09-30", "2026-09-21"]) {
      await log(prensa, d);
    }
    // Esta semana: el lunes, dos registros el mismo día (cuenta uno).
    await log(prensa, "2026-10-12");
    await log(prensa, "2026-10-12");

    const p = await getProgress(WEDNESDAY);
    expect(p.plannedPerWeek).toBe(2);
    expect(p.trainedThisWeek).toBe(1);
    expect(p.week.map((d) => `${d.planned ? "P" : "-"}${d.trained ? "T" : "-"}`)).toEqual([
      "PT",
      "--",
      "P-",
      "--",
      "--",
      "--",
      "--",
    ]);
    // Esta semana aún no está cumplida pero no rompe la racha: 2 semanas anteriores.
    expect(p.streak).toBe(2);
    expect(p.lastWeeks).toHaveLength(8);
    expect(p.lastWeeks.slice(-4).map((w) => w.trained)).toEqual([1, 2, 2, 1]);

    await log(prensa, "2026-10-14");
    expect((await getProgress(WEDNESDAY)).streak).toBe(3);
  });

  it("cuenta las clases hechas este mes, por días distintos", async () => {
    const [pilates] = await createGymClasses(
      { name: "Pilates", startTime: "18:15", durationMin: 45, room: "", instructor: "" },
      [2],
    );
    await setAttending(pilates!, true);
    const exerciseId = (await db.gymClasses.get(pilates!))!.exerciseId!;
    for (const d of ["2026-10-06", "2026-10-13", "2026-10-13", "2026-09-29"]) {
      await addLog(exerciseId, { date: d, kg: null, sets: 1, reps: null, note: null });
    }
    const p = await getProgress(WEDNESDAY);
    expect(p.classesThisMonth).toEqual([{ name: "Pilates", count: 2 }]);
    // Solo está planificado el martes (la clase marcada).
    expect(p.plannedPerWeek).toBe(1);
  });
});
