import { z } from "zod";
import { EXERCISE_TYPES, type Exercise, type Photo, type WeightLog } from "@/db/types";

/*
 * Traducción entre el modelo local (camelCase, IndexedDB) y las filas de Postgres
 * (snake_case). Todo lo que llega de la red se valida con Zod antes de guardarse.
 */

const syncColumns = {
  id: z.uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  server_updated_at: z.string(),
};

/** Postgres devuelve numeric a veces como texto: lo normalizamos a número. */
const numeric = z.union([z.number(), z.string().transform(Number)]).pipe(z.number());

export const exerciseRowSchema = z.object({
  ...syncColumns,
  name: z.string().max(120),
  type: z.enum(EXERCISE_TYPES),
  photo_id: z.uuid().nullable(),
  physio_notes: z.string().max(4000),
  sets: z.number().int(),
  reps: z.number().int().nullable(),
  duration_sec: z.number().int().nullable(),
  target_kg: numeric.nullable(),
});

export const photoRowSchema = z.object({
  ...syncColumns,
  mime: z.enum(["image/webp", "image/jpeg"]),
  width: z.number().int(),
  height: z.number().int(),
});

export const weightLogRowSchema = z.object({
  ...syncColumns,
  exercise_id: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: numeric.nullable(),
  sets: z.number().int(),
  reps: z.number().int().nullable(),
  note: z.string().max(500).nullable(),
});

type Synced = { id: string; createdAt: string; updatedAt: string; deletedAt: string | null };

const syncToRemote = (r: Synced) => ({
  id: r.id,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  deleted_at: r.deletedAt,
});

type SyncRow = { id: string; created_at: string; updated_at: string; deleted_at: string | null };

const syncFromRemote = (row: SyncRow) => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  dirty: 0 as const,
});

export const exerciseMapping = {
  toRemote: (e: Exercise) => ({
    ...syncToRemote(e),
    name: e.name,
    type: e.type,
    photo_id: e.photoId,
    physio_notes: e.physioNotes,
    sets: e.sets,
    reps: e.reps,
    duration_sec: e.durationSec,
    target_kg: e.targetKg,
  }),
  fromRemote: (raw: unknown): Exercise => {
    const row = exerciseRowSchema.parse(raw);
    return {
      ...syncFromRemote(row),
      name: row.name,
      type: row.type,
      photoId: row.photo_id,
      physioNotes: row.physio_notes,
      sets: row.sets,
      reps: row.reps,
      durationSec: row.duration_sec,
      targetKg: row.target_kg,
    };
  },
};

export const weightLogMapping = {
  toRemote: (l: WeightLog) => ({
    ...syncToRemote(l),
    exercise_id: l.exerciseId,
    date: l.date,
    kg: l.kg,
    sets: l.sets,
    reps: l.reps,
    note: l.note,
  }),
  fromRemote: (raw: unknown): WeightLog => {
    const row = weightLogRowSchema.parse(raw);
    return {
      ...syncFromRemote(row),
      exerciseId: row.exercise_id,
      date: row.date,
      kg: row.kg,
      sets: row.sets,
      reps: row.reps,
      note: row.note,
    };
  },
};

/** Las fotos viajan en dos partes: metadatos (tabla photos) y archivos (Storage). */
export const photoMapping = {
  toRemote: (p: Photo) => ({
    ...syncToRemote(p),
    mime: p.mime,
    width: p.width,
    height: p.height,
  }),
  /** Sin blobs: el motor los descarga de Storage aparte. */
  fromRemote: (raw: unknown) => {
    const row = photoRowSchema.parse(raw);
    return { ...syncFromRemote(row), mime: row.mime, width: row.width, height: row.height };
  },
};

/** Ruta del archivo en el bucket privado: siempre dentro de la carpeta del usuario. */
export function photoPath(
  userId: string,
  photoId: string,
  mime: string,
  variant: "full" | "thumb",
) {
  const ext = mime === "image/jpeg" ? "jpg" : "webp";
  return `${userId}/${photoId}${variant === "thumb" ? "-thumb" : ""}.${ext}`;
}
