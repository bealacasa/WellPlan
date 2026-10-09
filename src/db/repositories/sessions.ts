import { useLiveQuery } from "dexie-react-hooks";
import { sessionInputSchema, type SessionInput } from "@/lib/validation";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone, touch } from "../records";
import type { PlanEntry, Session } from "../types";

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

export async function createSession(input: SessionInput): Promise<string> {
  const data = sessionInputSchema.parse(input);
  const session = createRecord<Session>(data);
  await db.sessions.add(session);
  notifyLocalChange();
  return session.id;
}

export async function updateSession(id: string, input: SessionInput): Promise<void> {
  const data = sessionInputSchema.parse(input);
  await db.sessions.update(id, touch<Session>(data));
  notifyLocalChange();
}

/** Borra la sesión y la quita de todos los días del plan. */
export async function deleteSession(id: string): Promise<void> {
  await db.transaction("rw", db.sessions, db.planEntries, async () => {
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
