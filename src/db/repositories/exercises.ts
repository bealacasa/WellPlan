import { useLiveQuery } from "dexie-react-hooks";
import type { ProcessedImage } from "@/lib/image";
import { exerciseInputSchema, type ExerciseInput } from "@/lib/validation";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone, touch } from "../records";
import type { Exercise, Photo, WeightLog } from "../types";
import { newPhoto } from "./photos";
import { removeExerciseFromPlan } from "./plan";
import { removeExerciseFromSessions } from "./sessions";

const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, "es");

export async function listExercises(): Promise<Exercise[]> {
  const all = await db.exercises.toArray();
  return all.filter(isAlive).sort(byName);
}

/** Lista reactiva: se actualiza sola al cambiar la base de datos (también al sincronizar). */
export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(listExercises, []);
}

export function useExercise(id: string | undefined): Exercise | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const exercise = await db.exercises.get(id);
    return isAlive(exercise) ? exercise : null;
  }, [id]);
}

export async function createExercise(
  input: ExerciseInput,
  image?: ProcessedImage,
): Promise<string> {
  const data = exerciseInputSchema.parse(input);
  const photo = image ? await newPhoto(image) : null;
  const exercise = createRecord<Exercise>({ ...data, photoId: photo?.id ?? null });
  await db.transaction("rw", db.exercises, db.photos, async () => {
    if (photo) await db.photos.add(photo);
    await db.exercises.add(exercise);
  });
  notifyLocalChange();
  return exercise.id;
}

/**
 * Actualiza un ejercicio. `image`: nueva foto, "remove" para quitarla o undefined para
 * dejarla como está. La foto anterior se borra lógicamente (y en la nube al sincronizar).
 */
export async function updateExercise(
  id: string,
  input: ExerciseInput,
  image?: ProcessedImage | "remove",
): Promise<void> {
  const data = exerciseInputSchema.parse(input);
  // La foto se prepara fuera de la transacción (Dexie no admite esperas ajenas dentro).
  const photo = image && image !== "remove" ? await newPhoto(image) : null;
  await db.transaction("rw", db.exercises, db.photos, async () => {
    const current = await db.exercises.get(id);
    if (!isAlive(current)) throw new Error("El ejercicio no existe.");
    let photoId = current.photoId;
    if (image !== undefined) {
      if (current.photoId) await db.photos.update(current.photoId, tombstone<Photo>());
      photoId = null;
      if (photo) {
        await db.photos.add(photo);
        photoId = photo.id;
      }
    }
    await db.exercises.update(id, touch<Exercise>({ ...data, photoId }));
  });
  notifyLocalChange();
}

/** Borra el ejercicio con su foto y su historial, y lo quita de las sesiones y del plan. */
export async function deleteExercise(id: string): Promise<void> {
  await db.transaction(
    "rw",
    [db.exercises, db.photos, db.weightLogs, db.sessions, db.planEntries],
    async () => {
      const current = await db.exercises.get(id);
      if (!isAlive(current)) return;
      await db.exercises.update(id, tombstone<Exercise>());
      if (current.photoId) await db.photos.update(current.photoId, tombstone<Photo>());
      const logs = await db.weightLogs.where("exerciseId").equals(id).toArray();
      for (const log of logs.filter(isAlive))
        await db.weightLogs.update(log.id, tombstone<WeightLog>());
      await removeExerciseFromSessions(id);
      await removeExerciseFromPlan(id);
    },
  );
  notifyLocalChange();
}
