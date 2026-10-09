import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { WellPlanDB } from "./database";
import { getMeta, setMeta } from "./meta";
import { clock, createRecord, isAlive, tombstone, touch } from "./records";
import type { Exercise, WeightLog } from "./types";

let db: WellPlanDB;

beforeEach(async () => {
  db = new WellPlanDB(`test-${crypto.randomUUID()}`);
  await db.open();
});

const exercise = (name: string) =>
  createRecord<Exercise>({
    name,
    type: "maquina",
    photoId: null,
    physioNotes: "Espalda pegada al respaldo",
    sets: 3,
    reps: 12,
    durationSec: null,
    targetKg: 20,
  });

describe("registros", () => {
  it("crea con UUID, fechas y pendiente de sincronizar", () => {
    const e = exercise("Prensa");
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(e.dirty).toBe(1);
    expect(e.deletedAt).toBeNull();
    expect(e.createdAt).toBe(e.updatedAt);
  });

  it("touch actualiza la fecha y marca para subir", () => {
    const original = clock.now;
    clock.now = () => "2030-01-01T00:00:00.000Z";
    expect(touch<Exercise>({ name: "X" })).toEqual({
      name: "X",
      updatedAt: "2030-01-01T00:00:00.000Z",
      dirty: 1,
    });
    clock.now = original;
  });

  it("el borrado lógico oculta el registro", async () => {
    const e = exercise("Curl");
    await db.exercises.add(e);
    await db.exercises.update(e.id, tombstone<Exercise>());
    const stored = await db.exercises.get(e.id);
    expect(stored?.deletedAt).not.toBeNull();
    expect(isAlive(stored)).toBe(false);
  });
});

describe("esquema Dexie", () => {
  it("obtiene el último peso de un ejercicio con el índice compuesto", async () => {
    const e = exercise("Prensa");
    await db.exercises.add(e);
    const log = (date: string, kg: number) =>
      createRecord<WeightLog>({ exerciseId: e.id, date, kg, sets: 3, reps: 10, note: null });
    await db.weightLogs.bulkAdd([
      log("2026-10-01", 20),
      log("2026-10-08", 22.5),
      log("2026-10-05", 21),
    ]);

    const latest = await db.weightLogs
      .where("[exerciseId+date]")
      .between([e.id, Dexie.minKey], [e.id, Dexie.maxKey])
      .last();
    expect(latest?.kg).toBe(22.5);
  });

  it("encuentra los cambios pendientes de subir", async () => {
    await db.exercises.bulkAdd([exercise("A"), { ...exercise("B"), dirty: 0 }]);
    expect(await db.exercises.where("dirty").equals(1).count()).toBe(1);
  });
});

describe("meta", () => {
  it("guarda y lee valores locales", async () => {
    await setMeta("lastBackupAt", "2026-10-09");
    expect(await getMeta<string>("lastBackupAt")).toBe("2026-10-09");
  });
});
