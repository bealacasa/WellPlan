import { beforeEach, describe, expect, it } from "vitest";
import { moveItem } from "@/lib/lists";
import { fakeCloud } from "@/test/fakeCloud";
import { syncOnce } from "@/sync/engine";
import { db, WellPlanDB } from "../database";
import { createExercise, deleteExercise } from "./exercises";
import { addToDay, getWeekPlan, removeFromDay } from "./plan";
import { createSession, deleteSession, listSessions, updateSession } from "./sessions";

const exercise = (name: string) =>
  createExercise({
    name,
    type: "maquina",
    physioNotes: "",
    sets: 3,
    reps: 12,
    durationSec: null,
    targetKg: null,
  });

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("moveItem", () => {
  it("sube y baja elementos sin salirse de la lista", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});

describe("sesiones", () => {
  it("guarda el orden de los ejercicios y valida", async () => {
    const [a, b] = [await exercise("Prensa"), await exercise("Remo")];
    const id = await createSession({ name: "Pierna + core", exerciseIds: [b, a] });
    expect((await db.sessions.get(id))?.exerciseIds).toEqual([b, a]);

    await updateSession(id, { name: "Pierna", exerciseIds: [a, b] });
    expect((await db.sessions.get(id))?.exerciseIds).toEqual([a, b]);

    await expect(createSession({ name: " ", exerciseIds: [] })).rejects.toThrow();
    await expect(createSession({ name: "X", exerciseIds: [a, a] })).rejects.toThrow();
  });

  it("al borrar un ejercicio desaparece de las sesiones", async () => {
    const [a, b] = [await exercise("Prensa"), await exercise("Remo")];
    const id = await createSession({ name: "Pierna", exerciseIds: [a, b] });
    await deleteExercise(a);
    expect((await db.sessions.get(id))?.exerciseIds).toEqual([b]);
  });

  it("al borrar una sesión se quita de todos los días", async () => {
    const id = await createSession({ name: "Pierna", exerciseIds: [await exercise("Prensa")] });
    await addToDay(1, { sessionId: id });
    await addToDay(4, { sessionId: id });
    await deleteSession(id);

    expect(await listSessions()).toEqual([]);
    const plan = await getWeekPlan();
    expect(plan[1]).toEqual([]);
    expect(plan[4]).toEqual([]);
  });
});

describe("plan semanal", () => {
  it("asigna sesiones en orden, sin duplicados en el mismo día", async () => {
    const e = await exercise("Prensa");
    const pierna = await createSession({ name: "Pierna", exerciseIds: [e] });
    const core = await createSession({ name: "Core", exerciseIds: [e] });
    await addToDay(1, { sessionId: pierna });
    await addToDay(1, { sessionId: core });
    await addToDay(1, { sessionId: pierna });

    const monday = (await getWeekPlan())[1] ?? [];
    expect(monday.map((x) => x.sessionId)).toEqual([pierna, core]);

    await removeFromDay(monday[0]!.id);
    expect(((await getWeekPlan())[1] ?? []).map((x) => x.sessionId)).toEqual([core]);
    await expect(addToDay(8, { sessionId: core })).rejects.toThrow();
  });
});

describe("sincronización de sesiones y plan", () => {
  it("otro dispositivo recibe la sesión con sus ejercicios en orden y el plan", async () => {
    const cloud = fakeCloud();
    const user = "11111111-1111-4111-8111-111111111111";
    const [a, b, c] = [await exercise("A"), await exercise("B"), await exercise("C")];
    const id = await createSession({ name: "Pierna + core", exerciseIds: [c, a, b] });
    await addToDay(3, { sessionId: id });
    await syncOnce(db, cloud.client, user);

    const other = new WellPlanDB(`otro-${crypto.randomUUID()}`);
    await other.open();
    await syncOnce(other, cloud.client, user);
    expect((await other.sessions.get(id))?.exerciseIds).toEqual([c, a, b]);
    expect((await other.planEntries.toArray()).map((p) => [p.weekday, p.sessionId])).toEqual([
      [3, id],
    ]);

    // Reordenar en un dispositivo llega al otro.
    await updateSession(id, { name: "Pierna + core", exerciseIds: [a, b, c] });
    await syncOnce(db, cloud.client, user);
    await syncOnce(other, cloud.client, user);
    expect((await other.sessions.get(id))?.exerciseIds).toEqual([a, b, c]);
  });
});

describe("cardio y ejercicios sueltos en el plan", () => {
  it("se sincronizan entre dispositivos", async () => {
    const cloud = fakeCloud();
    const user = "11111111-1111-4111-8111-111111111111";
    const run = await createExercise({
      name: "Correr CaCo",
      type: "cardio",
      physioNotes: "",
      sets: 1,
      reps: null,
      durationSec: 1800,
      targetKg: null,
      targetDistanceKm: 4,
      intervalRunSec: 120,
      intervalWalkSec: 60,
      intervalRounds: 8,
    });
    await addToDay(3, { exerciseId: run });
    const { addLog } = await import("./weightLogs");
    await addLog(run, {
      date: "2026-10-09",
      kg: null,
      sets: 1,
      reps: null,
      distanceKm: 4.2,
      durationSec: 1700,
      effort: 6,
      note: "Bien",
    });
    await syncOnce(db, cloud.client, user);

    const other = new WellPlanDB(`otro-${crypto.randomUUID()}`);
    await other.open();
    await syncOnce(other, cloud.client, user);
    expect(await other.exercises.get(run)).toMatchObject({
      type: "cardio",
      targetDistanceKm: 4,
      intervalRounds: 8,
    });
    expect((await other.weightLogs.toArray())[0]).toMatchObject({
      distanceKm: 4.2,
      durationSec: 1700,
      effort: 6,
    });
    expect((await other.planEntries.toArray())[0]).toMatchObject({
      weekday: 3,
      sessionId: null,
      exerciseId: run,
    });
  });

  it("borrar el ejercicio lo quita del plan", async () => {
    const yoga = await exercise("Yoga");
    await addToDay(2, { exerciseId: yoga });
    await deleteExercise(yoga);
    expect((await getWeekPlan())[2]).toEqual([]);
  });
});
