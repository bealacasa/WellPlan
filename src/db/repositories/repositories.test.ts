import { beforeEach, describe, expect, it } from "vitest";
import { onLocalChange } from "../changes";
import { db } from "../database";
import { createExercise, deleteExercise, listExercises, updateExercise } from "./exercises";
import { addLog, deleteLog, getLastLog, listLogs } from "./weightLogs";

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
