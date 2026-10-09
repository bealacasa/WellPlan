import type { SupabaseClient } from "@supabase/supabase-js";
import type { Table } from "dexie";
import { getMeta, setMeta } from "@/db/meta";
import type { WellPlanDB } from "@/db/database";
import type { Photo, Session, SyncFields } from "@/db/types";
import {
  exerciseMapping,
  photoMapping,
  photoPath,
  planMapping,
  sessionExerciseRowSchema,
  sessionMapping,
  weightLogMapping,
} from "./mapping";
import { shouldApplyRemote } from "./merge";

/*
 * Motor de sincronización offline-first:
 *   1. SUBIR: los registros con dirty = 1 se envían con upsert (insertar o actualizar por id).
 *   2. BAJAR: se piden las filas con server_updated_at >= último cursor y se fusionan.
 * El orden importa por las claves foráneas:
 *   fotos → ejercicios → registros de peso → sesiones (+ su lista de ejercicios) → plan.
 */

export type SyncClient = Pick<SupabaseClient, "from" | "storage" | "rpc">;

const BATCH = 100;
const PAGE = 500;
const BUCKET = "photos";
const EPOCH = "1970-01-01T00:00:00.000Z";

export class AccountMismatchError extends Error {
  constructor() {
    super("Este dispositivo tiene datos de otra cuenta.");
  }
}

type LocalTable = "photos" | "exercises" | "weightLogs" | "sessions" | "planEntries";
type TableSpec = {
  local: LocalTable;
  remote: string;
  toRemote: (record: never) => Record<string, unknown>;
};

const asSpec = (fn: (record: never) => Record<string, unknown>) => fn;

const TABLES: TableSpec[] = [
  { local: "photos", remote: "photos", toRemote: asSpec(photoMapping.toRemote) },
  { local: "exercises", remote: "exercises", toRemote: asSpec(exerciseMapping.toRemote) },
  { local: "weightLogs", remote: "weight_logs", toRemote: asSpec(weightLogMapping.toRemote) },
  { local: "sessions", remote: "sessions", toRemote: asSpec(sessionMapping.toRemote) },
  { local: "planEntries", remote: "week_plan", toRemote: asSpec(planMapping.toRemote) },
];

function tableOf(db: WellPlanDB, name: LocalTable): Table<SyncFields, string> {
  return db[name] as unknown as Table<SyncFields, string>;
}

/** Sube o borra en Storage los archivos de las fotos pendientes. */
async function pushPhotoFiles(client: SyncClient, userId: string, photos: Photo[]) {
  const bucket = client.storage.from(BUCKET);
  for (const photo of photos) {
    const files = [
      { path: photoPath(userId, photo.id, photo.mime, "full"), bytes: photo.full },
      { path: photoPath(userId, photo.id, photo.mime, "thumb"), bytes: photo.thumb },
    ];
    if (photo.deletedAt) {
      // Si ya no existían, Storage no da error: borrar es idempotente.
      const { error } = await bucket.remove(files.map((f) => f.path));
      if (error) throw error;
      continue;
    }
    for (const { path, bytes } of files) {
      const blob = new Blob([bytes], { type: photo.mime });
      const { error } = await bucket.upload(path, blob, { upsert: true, contentType: photo.mime });
      if (error) throw error;
    }
  }
}

/** Guarda el orden de ejercicios de cada sesión con la función atómica de Postgres. */
async function pushSessionExercises(client: SyncClient, sessions: Session[]) {
  for (const session of sessions) {
    if (session.deletedAt) continue;
    const { error } = await client.rpc("set_session_exercises", {
      p_session_id: session.id,
      p_exercise_ids: session.exerciseIds,
    });
    if (error) throw error;
  }
}

async function push(db: WellPlanDB, client: SyncClient, userId: string, spec: TableSpec) {
  const table = tableOf(db, spec.local);
  const pending = await table.where("dirty").equals(1).toArray();
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    if (spec.local === "photos") await pushPhotoFiles(client, userId, batch as Photo[]);
    const rows = batch.map((r) => spec.toRemote(r as never));
    const { error } = await client.from(spec.remote).upsert(rows, { onConflict: "id" });
    if (error) throw error;
    if (spec.local === "sessions") await pushSessionExercises(client, batch as Session[]);
    // Solo se marca como subido si nadie lo ha vuelto a modificar mientras tanto.
    const sent = new Map(batch.map((r) => [r.id, r.updatedAt]));
    await table
      .where("id")
      .anyOf([...sent.keys()])
      .modify((r) => {
        if (sent.get(r.id) === r.updatedAt) r.dirty = 0;
      });
  }
  return pending.length;
}

async function downloadPhoto(client: SyncClient, userId: string, id: string, mime: string) {
  const bucket = client.storage.from(BUCKET);
  const get = async (variant: "full" | "thumb") => {
    const { data, error } = await bucket.download(photoPath(userId, id, mime, variant));
    if (error || !data) throw error ?? new Error("Foto no disponible");
    return data.arrayBuffer();
  };
  const [full, thumb] = await Promise.all([get("full"), get("thumb")]);
  return { full, thumb };
}

/** Lista ordenada de ejercicios de varias sesiones (tabla intermedia session_exercises). */
async function fetchSessionExercises(
  client: SyncClient,
  sessionIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>(sessionIds.map((id) => [id, []]));
  if (sessionIds.length === 0) return result;
  const { data, error } = await client
    .from("session_exercises")
    .select("session_id, exercise_id, position")
    .in("session_id", sessionIds)
    .order("position", { ascending: true });
  if (error) throw error;
  for (const raw of data ?? []) {
    const row = sessionExerciseRowSchema.parse(raw);
    result.get(row.session_id)?.push(row.exercise_id);
  }
  return result;
}

type PullContext = {
  client: SyncClient;
  userId: string;
  existing: SyncFields | undefined;
  sessionExercises: Map<string, string[]>;
};

async function toLocal(spec: TableSpec, raw: unknown, ctx: PullContext): Promise<SyncFields> {
  switch (spec.local) {
    case "exercises":
      return exerciseMapping.fromRemote(raw);
    case "weightLogs":
      return weightLogMapping.fromRemote(raw);
    case "planEntries":
      return planMapping.fromRemote(raw);
    case "sessions": {
      const id = (raw as { id: string }).id;
      return sessionMapping.fromRemote(raw, ctx.sessionExercises.get(id) ?? []);
    }
    case "photos": {
      const meta = photoMapping.fromRemote(raw);
      const local = ctx.existing as Photo | undefined;
      // Foto borrada: conservamos el registro (para no resucitarla) pero liberamos espacio.
      // Si no, las fotos no cambian de contenido: si ya la tenemos, no se vuelve a descargar.
      const files = meta.deletedAt
        ? { full: new ArrayBuffer(0), thumb: new ArrayBuffer(0) }
        : local?.full?.byteLength
          ? { full: local.full, thumb: local.thumb }
          : await downloadPhoto(ctx.client, ctx.userId, meta.id, meta.mime);
      const photo: Photo = { ...meta, ...files };
      return photo;
    }
  }
}

async function pull(db: WellPlanDB, client: SyncClient, userId: string, spec: TableSpec) {
  const table = tableOf(db, spec.local);
  const cursorKey = `syncCursor:${spec.remote}` as const;
  let cursor = (await getMeta<string>(cursorKey, db)) ?? EPOCH;
  let applied = 0;

  for (;;) {
    const { data, error } = await client
      .from(spec.remote)
      .select("*")
      .gte("server_updated_at", cursor)
      .order("server_updated_at", { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    const rows = (data ?? []) as {
      id: string;
      updated_at: string;
      server_updated_at: string;
      deleted_at: string | null;
    }[];

    const toApply = [];
    for (const row of rows) {
      const existing = await table.get(row.id);
      if (!shouldApplyRemote(existing, row.updated_at)) continue;
      // Si ya la tenemos idéntica (p. ej. la subimos nosotros), no hace falta reescribirla.
      if (existing && existing.dirty === 0 && existing.updatedAt === row.updated_at) continue;
      toApply.push({ row, existing });
    }

    const sessionExercises =
      spec.local === "sessions"
        ? await fetchSessionExercises(
            client,
            toApply.filter(({ row }) => !row.deleted_at).map(({ row }) => row.id),
          )
        : new Map<string, string[]>();

    for (const { row, existing } of toApply) {
      await table.put(await toLocal(spec, row, { client, userId, existing, sessionExercises }));
      applied++;
    }

    const last = rows.at(-1)?.server_updated_at;
    if (!last || last === cursor) break;
    cursor = last;
    await setMeta(cursorKey, cursor, db);
    if (rows.length < PAGE) break;
  }
  return applied;
}

export type SyncReport = { pushed: number; pulled: number };

/**
 * Una pasada completa de sincronización. Lanza AccountMismatchError si el dispositivo ya
 * se sincronizaba con otra cuenta: así nunca se mezclan datos de salud de dos personas.
 */
export async function syncOnce(
  db: WellPlanDB,
  client: SyncClient,
  userId: string,
): Promise<SyncReport> {
  const owner = await getMeta<string>("syncUserId", db);
  if (owner && owner !== userId) throw new AccountMismatchError();
  if (!owner) await setMeta("syncUserId", userId, db);

  let pushed = 0;
  let pulled = 0;
  for (const spec of TABLES) pushed += await push(db, client, userId, spec);
  for (const spec of TABLES) pulled += await pull(db, client, userId, spec);
  await setMeta("lastSyncAt", new Date().toISOString(), db);
  return { pushed, pulled };
}

/** Número de cambios locales aún no subidos. */
export async function pendingCount(db: WellPlanDB): Promise<number> {
  let total = 0;
  for (const spec of TABLES)
    total += await tableOf(db, spec.local).where("dirty").equals(1).count();
  return total;
}
