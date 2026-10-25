import { beforeEach, describe, expect, it } from "vitest";
import { onLocalChange } from "../changes";
import { db } from "../database";
import { createExercise, deleteExercise, listExercises, updateExercise } from "./exercises";
import {
  addLog,
  deleteLog,
  getLastLog,
  listLogs,
  restoreLogs,
  syncAllLastKg,
  unmarkDay,
} from "./weightLogs";

const input = {
  name: "Prensa",
  type: "maquina" as const,
  physioNotes: "Espalda pegada",
  sets: 3,
  reps: 12,
  durationSec: null,
  targetKg: 20,
};
const image = (label: string) => ({
  full: new Blob([`full-${label}`], { type: "image/webp" }),
  thumb: new Blob([`thumb-${label}`], { type: "image/webp" }),
  mime: "image/webp",
  width: 1200,
  height: 900,
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("ejercicios", () => {
  it("crea con foto, lista por nombre y avisa al motor de sync", async () => {
    let changes = 0;
    const stop = onLocalChange(() => changes++);
    await createExercise({ ...input, name: "Remo" });
    const id = await createExercise(input, image("a"));
    stop();

    const list = await listExercises();
    expect(list.map((e) => e.name)).toEqual(["Prensa", "Remo"]);
    const created = await db.exercises.get(id);
    expect(created?.photoId).toBeTruthy();
    expect((await db.photos.get(created!.photoId!))?.dirty).toBe(1);
    expect(changes).toBe(2);
  });

  it("al cambiar la foto, la anterior se borra lógicamente", async () => {
    const id = await createExercise(input, image("a"));
    const oldPhotoId = (await db.exercises.get(id))!.photoId!;
    await updateExercise(id, { ...input, name: "Prensa 45°" }, image("b"));

    const updated = await db.exercises.get(id);
    expect(updated?.name).toBe("Prensa 45°");
    expect(updated?.photoId).not.toBe(oldPhotoId);
    expect((await db.photos.get(oldPhotoId))?.deletedAt).not.toBeNull();

    await updateExercise(id, input, "remove");
    expect((await db.exercises.get(id))?.photoId).toBeNull();
  });

  it("borrar un ejercicio borra su foto y su historial", async () => {
    const id = await createExercise(input, image("a"));
    await addLog(id, { date: "2026-10-09", kg: 20, sets: 3, reps: 12, note: null });
    await deleteExercise(id);

    expect(await listExercises()).toEqual([]);
    expect(await listLogs(id)).toEqual([]);
    const photo = (await db.photos.toArray())[0];
    expect(photo?.deletedAt).not.toBeNull();
  });
});

describe("registros de peso", () => {
  it("el último registro es el de fecha más reciente y se ignoran los borrados", async () => {
    const id = await createExercise(input);
    await addLog(id, { date: "2026-10-01", kg: 20, sets: 3, reps: 12, note: null });
    const latest = await addLog(id, {
      date: "2026-10-08",
      kg: 22.5,
      sets: 3,
      reps: 10,
      note: "Rodilla",
    });
    await addLog(id, { date: "2026-10-05", kg: 21, sets: 3, reps: 12, note: "" });

    expect((await getLastLog(id))?.kg).toBe(22.5);
    await deleteLog(latest);
    expect((await getLastLog(id))?.kg).toBe(21);
    expect((await listLogs(id)).map((l) => l.date)).toEqual(["2026-10-05", "2026-10-01"]);
  });

  it("valida antes de guardar", async () => {
    const id = await createExercise(input);
    await expect(
      addLog(id, { date: "ayer", kg: 20, sets: 3, reps: 12, note: null }),
    ).rejects.toThrow();
    await expect(
      addLog(id, { date: "2026-10-09", kg: 900, sets: 3, reps: 12, note: null }),
    ).rejects.toThrow();
  });
});

describe("el peso del ejercicio es el último que has levantado", () => {
  const log = (id: string, date: string, kg: number | null) =>
    addLog(id, { date, kg, sets: 3, reps: 12, note: null });

  it("se actualiza al registrar y vuelve al anterior si se quita el último", async () => {
    const prensa = await createExercise({
      name: "Prensa",
      type: "maquina",
      physioNotes: "",
      sets: 3,
      reps: 12,
      durationSec: null,
      targetKg: null,
    });
    await log(prensa, "2026-10-01", 20);
    expect((await db.exercises.get(prensa))?.targetKg).toBe(20);
    const last = await log(prensa, "2026-10-08", 25);
    expect((await db.exercises.get(prensa))?.targetKg).toBe(25);

    await deleteLog(last);
    expect((await db.exercises.get(prensa))?.targetKg).toBe(20);
    await restoreLogs([last]);
    expect((await db.exercises.get(prensa))?.targetKg).toBe(25);
    await unmarkDay(prensa, "2026-10-08");
    expect((await db.exercises.get(prensa))?.targetKg).toBe(20);
  });

  it("no toca el peso corporal y pone al día los datos de antes al abrir la app", async () => {
    const puente = await createExercise({
      name: "Puente",
      type: "peso_corporal",
      physioNotes: "",
      sets: 3,
      reps: 12,
      durationSec: null,
      targetKg: null,
    });
    await log(puente, "2026-10-01", null);
    expect((await db.exercises.get(puente))?.targetKg).toBeNull();

    // Registro anterior a esta versión: el ejercicio aún tiene el peso de antes.
    const remo = await createExercise({
      name: "Remo",
      type: "maquina",
      physioNotes: "",
      sets: 3,
      reps: 12,
      durationSec: null,
      targetKg: 30,
    });
    await log(remo, "2026-10-01", 35);
    await db.exercises.update(remo, { targetKg: 30 });
    await syncAllLastKg();
    expect((await db.exercises.get(remo))?.targetKg).toBe(35);
  });
});

describe("recompensas abiertas", () => {
  it("se recuerdan en el dispositivo para no repetir la sorpresa", async () => {
    const { markRewardsSeen, unopened } = await import("./rewards");
    const { getMeta } = await import("../meta");
    const rewards = [
      { id: "a", emoji: "", title: "", description: "", hint: "", earned: true },
      { id: "b", emoji: "", title: "", description: "", hint: "", earned: true },
      { id: "c", emoji: "", title: "", description: "", hint: "", earned: false },
    ];
    await markRewardsSeen(["a"]);
    const seen = new Set((await getMeta<string[]>("seenRewards")) ?? []);
    expect(unopened(rewards, seen).map((r) => r.id)).toEqual(["b"]);
  });
});
