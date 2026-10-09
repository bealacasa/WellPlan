import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../database";
import { createExercise, deleteExercise } from "./exercises";
import {
  clearGymSchedule,
  createGymClasses,
  listGymClasses,
  setAttending,
  updateGymClass,
} from "./gymClasses";
import { getTodayPlan } from "./today";

// Lunes 12 de octubre de 2026, a mediodía (hora local).
const MONDAY = new Date(2026, 9, 12, 12);
const pilates = { name: "Pilates", startTime: "18:30", durationMin: 55, room: "", instructor: "" };

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("horario del gimnasio", () => {
  it("una clase en varios días crea una fila por día, ordenadas por día y hora", async () => {
    await createGymClasses(pilates, [3, 1]);
    await createGymClasses({ ...pilates, name: "Spinning", startTime: "07:15" }, [1]);
    const all = await listGymClasses();
    expect(all.map((c) => `${c.weekday} ${c.startTime} ${c.name}`)).toEqual([
      "1 07:15 Spinning",
      "1 18:30 Pilates",
      "3 18:30 Pilates",
    ]);
    await expect(createGymClasses(pilates, [])).rejects.toThrow();
    await expect(createGymClasses({ ...pilates, startTime: "25:00" }, [1])).rejects.toThrow();
  });

  it("al marcar «voy» se enlaza con una clase existente del mismo nombre o se crea", async () => {
    const existing = await createExercise({
      name: "pilates",
      type: "clase",
      physioNotes: "",
      sets: 1,
      reps: null,
      durationSec: 3600,
      targetKg: null,
    });
    const [monday, wednesday] = await createGymClasses(pilates, [1, 3]);
    await setAttending(monday!, true);
    await setAttending(wednesday!, true);
    const classes = await listGymClasses();
    expect(classes.every((c) => c.attending && c.exerciseId === existing)).toBe(true);

    const [yoga] = await createGymClasses({ ...pilates, name: "Yoga" }, [1]);
    await setAttending(yoga!, true);
    const created = await db.exercises.get((await db.gymClasses.get(yoga!))!.exerciseId!);
    expect(created).toMatchObject({ name: "Yoga", type: "clase", durationSec: 55 * 60 });
  });

  it("Hoy muestra primero las clases marcadas, por hora, con sus detalles", async () => {
    const [late] = await createGymClasses({ ...pilates, room: "Sala 2", instructor: "Marta" }, [1]);
    const [early] = await createGymClasses(
      { ...pilates, name: "Spinning", startTime: "07:15" },
      [1],
    );
    await createGymClasses({ ...pilates, name: "Zumba" }, [1]); // no marcada
    await setAttending(late!, true);
    await setAttending(early!, true);

    const today = await getTodayPlan(MONDAY);
    expect(today.items.map((i) => `${i.time} ${i.title}`)).toEqual([
      "07:15 Spinning",
      "18:30 Pilates",
    ]);
    expect(today.items[1]).toMatchObject({ kind: "class", detail: "55 min · Sala 2 · Marta" });

    await setAttending(late!, false);
    expect((await getTodayPlan(MONDAY)).items).toHaveLength(1);
  });

  it("borrar el ejercicio desmarca la clase; vaciar el horario conserva el historial", async () => {
    const [id] = await createGymClasses(pilates, [1]);
    await setAttending(id!, true);
    const exerciseId = (await db.gymClasses.get(id!))!.exerciseId!;
    await deleteExercise(exerciseId);
    expect(await db.gymClasses.get(id!)).toMatchObject({ attending: false, exerciseId: null });

    await setAttending(id!, true);
    await updateGymClass(id!, { ...pilates, weekday: 2, startTime: "19:00" });
    expect(await db.gymClasses.get(id!)).toMatchObject({ weekday: 2, startTime: "19:00" });
    await clearGymSchedule();
    expect(await listGymClasses()).toHaveLength(0);
    expect((await db.exercises.toArray()).filter((e) => e.deletedAt === null)).toHaveLength(1);
  });
});
