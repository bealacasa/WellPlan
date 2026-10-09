import { useLiveQuery } from "dexie-react-hooks";
import type { ProcessedImage } from "@/lib/image";
import { sessionInputSchema, type SessionInput } from "@/lib/validation";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone, touch } from "../records";
import type { Photo, PlanEntry, Session } from "../types";
import { newPhoto } from "./photos";

const byName = (a: Session, b: Session) => a.name.localeCompare(b.name, "es");

export async function listSessions(): Promise<Session[]> {
  return (await db.sessions.toArray()).filter(isAlive).sort(byName);
}

export function useSessions(): Session[] | undefined {
  return useLiveQuery(listSessions, []);
}

export function useSession(id: string | undefined): Session | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const session = await db.sessions.get(id);
    return isAlive(session) ? session : null;
  }, [id]);
}

export async function createSession(input: SessionInput, image?: ProcessedImage): Promise<string> {
  const data = sessionInputSchema.parse(input);
  const photo = image ? await newPhoto(image) : null;
  const session = createRecord<Session>({ ...data, photoId: photo?.id ?? null });
  await db.transaction("rw", db.sessions, db.photos, async () => {
    if (photo) await db.photos.add(photo);
    await db.sessions.add(session);
  });
  notifyLocalChange();
  return session.id;
}

/**
 * Actualiza una sesión. `image`: nueva foto, "remove" para quitarla o undefined para
 * dejarla como está (igual que en los ejercicios).
 */
export async function updateSession(
  id: string,
  input: SessionInput,
  image?: ProcessedImage | "remove",
): Promise<void> {
  const data = sessionInputSchema.parse(input);
  const photo = image && image !== "remove" ? await newPhoto(image) : null;
  await db.transaction("rw", db.sessions, db.photos, async () => {
    const current = await db.sessions.get(id);
    if (!isAlive(current)) throw new Error("La sesión no existe.");
    let photoId = current.photoId;
    if (image !== undefined) {
      if (current.photoId) await db.photos.update(current.photoId, tombstone<Photo>());
      photoId = null;
      if (photo) {
        await db.photos.add(photo);
        photoId = photo.id;
      }
    }
    await db.sessions.update(id, touch<Session>({ ...data, photoId }));
  });
  notifyLocalChange();
}

/** Borra la sesión (con su foto) y la quita de todos los días del plan. */
export async function deleteSession(id: string): Promise<void> {
  await db.transaction("rw", db.sessions, db.planEntries, db.photos, async () => {
    const current = await db.sessions.get(id);
    if (current?.photoId) await db.photos.update(current.photoId, tombstone<Photo>());
    await db.sessions.update(id, tombstone<Session>());
    const entries = await db.planEntries.where("sessionId").equals(id).toArray();
    for (const entry of entries.filter(isAlive)) {
      await db.planEntries.update(entry.id, tombstone<PlanEntry>());
    }
  });
  notifyLocalChange();
}

/** Quita un ejercicio (borrado) de todas las sesiones que lo incluyan. */
export async function removeExerciseFromSessions(exerciseId: string): Promise<void> {
  const sessions = (await db.sessions.toArray()).filter(
    (s) => isAlive(s) && s.exerciseIds.includes(exerciseId),
  );
  for (const s of sessions) {
    await db.sessions.update(
      s.id,
      touch<Session>({ exerciseIds: s.exerciseIds.filter((e) => e !== exerciseId) }),
    );
  }
}
