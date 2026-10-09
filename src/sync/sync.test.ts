import { beforeEach, describe, expect, it } from "vitest";
import { db, WellPlanDB } from "@/db/database";
import { createExercise, deleteExercise, updateExercise } from "@/db/repositories/exercises";
import { addLog } from "@/db/repositories/weightLogs";
import { AccountMismatchError, pendingCount, syncOnce, type SyncClient } from "./engine";
import { exerciseMapping, photoPath } from "./mapping";
import { shouldApplyRemote } from "./merge";

type Row = Record<string, unknown> & { id: string; server_updated_at: string };

/** Nube falsa en memoria: imita las partes de supabase-js que usa el motor. */
function fakeCloud() {
  const tables: Record<string, Map<string, Row>> = {};
  const files = new Map<string, Blob>();
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 9, 9) + ++tick * 1000).toISOString();

  const client = {
    from(name: string) {
      const table = (tables[name] ??= new Map());
      return {
        upsert: async (rows: Row[]) => {
          for (const row of rows) {
            table.set(row.id, { ...table.get(row.id), ...row, server_updated_at: now() });
          }
          return { error: null };
        },
        select: () => {
          const query = {
            column: "",
            value: "",
            gte(column: string, value: string) {
              query.column = column;
              query.value = value;
              return query;
            },
            order: () => query,
            limit: async (n: number) => ({
              data: [...table.values()]
                .filter((r) => String(r[query.column]) >= query.value)
                .sort((a, b) => a.server_updated_at.localeCompare(b.server_updated_at))
                .slice(0, n),
              error: null,
            }),
          };
          return query;
        },
      };
    },
    storage: {
      from: () => ({
        upload: async (path: string, blob: Blob) => {
          files.set(path, blob);
          return { error: null };
        },
        remove: async (paths: string[]) => {
          for (const p of paths) files.delete(p);
          return { error: null };
        },
        download: async (path: string) =>
          files.has(path)
            ? { data: files.get(path), error: null }
            : { data: null, error: new Error("not found") },
      }),
    },
  };
  return { client: client as unknown as SyncClient, tables, files };
}

const USER = "11111111-1111-4111-8111-111111111111";
const exerciseInput = {
  name: "Prensa",
  type: "maquina" as const,
  physioNotes: "Espalda pegada",
  sets: 3,
  reps: 12,
  durationSec: null,
  targetKg: 20,
};
const image = {
  full: new Blob(["full"], { type: "image/webp" }),
  thumb: new Blob(["thumb"], { type: "image/webp" }),
  mime: "image/webp",
  width: 1200,
  height: 900,
};

let otherDevice: WellPlanDB;

beforeEach(async () => {
  await db.delete();
  await db.open();
  otherDevice = new WellPlanDB(`otro-${crypto.randomUUID()}`);
  await otherDevice.open();
});

describe("sincronización", () => {
  it("sube ejercicios, fotos y pesos, y otro dispositivo los recibe", async () => {
    const cloud = fakeCloud();
    const id = await createExercise(exerciseInput, image);
    await addLog(id, { date: "2026-10-09", kg: 22.5, sets: 3, reps: 10, note: "Rodilla bien" });

    const report = await syncOnce(db, cloud.client, USER);
    expect(report.pushed).toBe(3);
    expect(await pendingCount(db)).toBe(0);
    expect(cloud.tables.exercises?.get(id)?.name).toBe("Prensa");
    const photoId = (await db.exercises.get(id))!.photoId!;
    expect(cloud.files.has(photoPath(USER, photoId, "image/webp", "full"))).toBe(true);
    expect(cloud.files.has(photoPath(USER, photoId, "image/webp", "thumb"))).toBe(true);

    await syncOnce(otherDevice, cloud.client, USER);
    const received = await otherDevice.exercises.get(id);
    expect(received?.physioNotes).toBe("Espalda pegada");
    expect(received?.dirty).toBe(0);
    expect((await otherDevice.weightLogs.toArray())[0]?.kg).toBe(22.5);
    const photo = await otherDevice.photos.get(photoId);
    expect(new TextDecoder().decode(photo?.full)).toBe("full");
  });

  it("los borrados se propagan y las fotos borradas desaparecen de Storage", async () => {
    const cloud = fakeCloud();
    const id = await createExercise(exerciseInput, image);
    await syncOnce(db, cloud.client, USER);
    await syncOnce(otherDevice, cloud.client, USER);

    await deleteExercise(id);
    await syncOnce(db, cloud.client, USER);
    expect(cloud.files.size).toBe(0);

    await syncOnce(otherDevice, cloud.client, USER);
    expect((await otherDevice.exercises.get(id))?.deletedAt).not.toBeNull();
  });

  it("en un conflicto gana el cambio más reciente", async () => {
    const cloud = fakeCloud();
    const id = await createExercise(exerciseInput);
    await syncOnce(db, cloud.client, USER);
    await syncOnce(otherDevice, cloud.client, USER);

    // El otro dispositivo cambia el nombre y sube; luego este cambia (más tarde) sin haber bajado.
    const remote = (await otherDevice.exercises.get(id))!;
    await otherDevice.exercises.put({
      ...remote,
      name: "Desde el iPad",
      updatedAt: "2026-10-09T10:00:00.000Z",
      dirty: 1,
    });
    await syncOnce(otherDevice, cloud.client, USER);
    await updateExercise(id, { ...exerciseInput, name: "Desde el iPhone" });

    await syncOnce(db, cloud.client, USER);
    expect((await db.exercises.get(id))?.name).toBe("Desde el iPhone");
    await syncOnce(otherDevice, cloud.client, USER);
    expect((await otherDevice.exercises.get(id))?.name).toBe("Desde el iPhone");
  });

  it("no mezcla datos de dos cuentas en el mismo dispositivo", async () => {
    const cloud = fakeCloud();
    await syncOnce(db, cloud.client, USER);
    await expect(
      syncOnce(db, cloud.client, "22222222-2222-4222-8222-222222222222"),
    ).rejects.toThrow(AccountMismatchError);
  });

  it("rechaza filas remotas con datos no válidos", () => {
    expect(() => exerciseMapping.fromRemote({ id: "x", name: 3 })).toThrow();
  });
});

describe("shouldApplyRemote", () => {
  const local = {
    id: "a",
    createdAt: "",
    updatedAt: "2026-10-09T10:00:00Z",
    deletedAt: null,
    dirty: 1 as const,
  };

  it("aplica si no hay cambios locales pendientes", () => {
    expect(shouldApplyRemote(undefined, "2020-01-01T00:00:00Z")).toBe(true);
    expect(shouldApplyRemote({ ...local, dirty: 0 }, "2020-01-01T00:00:00Z")).toBe(true);
  });

  it("con cambios pendientes, solo si el remoto es más reciente", () => {
    expect(shouldApplyRemote(local, "2026-10-09T09:00:00Z")).toBe(false);
    expect(shouldApplyRemote(local, "2026-10-09T11:00:00Z")).toBe(true);
  });
});
