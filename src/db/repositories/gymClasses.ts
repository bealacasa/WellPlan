import { useLiveQuery } from "dexie-react-hooks";
import { gymClassInputSchema, type GymClassInput } from "@/lib/validation";
import { notifyLocalChange } from "../changes";
import { db } from "../database";
import { createRecord, isAlive, tombstone, touch } from "../records";
import type { Exercise, GymClass } from "../types";

const byTime = (a: GymClass, b: GymClass) =>
  a.weekday - b.weekday ||
  a.startTime.localeCompare(b.startTime) ||
  a.name.localeCompare(b.name, "es");

export async function listGymClasses(): Promise<GymClass[]> {
  return (await db.gymClasses.toArray()).filter(isAlive).sort(byTime);
}

export function useGymClasses(): GymClass[] | undefined {
  return useLiveQuery(listGymClasses, []);
}

export function useGymClass(id: string | undefined): GymClass | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const gymClass = await db.gymClasses.get(id);
    return isAlive(gymClass) ? gymClass : null;
  }, [id]);
}

/** Crea la clase en cada uno de los días indicados (p. ej. Pilates lunes y miércoles). */
export async function createGymClasses(
  input: Omit<GymClassInput, "weekday">,
  weekdays: number[],
): Promise<string[]> {
  const days = [...new Set(weekdays)];
  if (days.length === 0) throw new Error("Elige al menos un día.");
  const records = days.map((weekday) =>
    createRecord<GymClass>({
      ...gymClassInputSchema.parse({ ...input, weekday }),
      attending: false,
      exerciseId: null,
    }),
  );
  await db.gymClasses.bulkAdd(records);
  notifyLocalChange();
  return records.map((r) => r.id);
}

export async function updateGymClass(id: string, input: GymClassInput): Promise<void> {
  const data = gymClassInputSchema.parse(input);
  await db.gymClasses.update(id, touch<GymClass>(data));
  notifyLocalChange();
}

export async function deleteGymClass(id: string): Promise<void> {
  await db.gymClasses.update(id, tombstone<GymClass>());
  notifyLocalChange();
}

/** Para cuando el gimnasio cambia de horario: borra todas las clases (el historial se queda). */
export async function clearGymSchedule(): Promise<void> {
  await db.transaction("rw", db.gymClasses, async () => {
    const all = (await db.gymClasses.toArray()).filter(isAlive);
    for (const gymClass of all) await db.gymClasses.update(gymClass.id, tombstone<GymClass>());
  });
  notifyLocalChange();
}

const sameName = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" }) === 0;

/**
 * Marca o desmarca "voy" en una clase. Al marcarla se enlaza con un ejercicio de tipo
 * "clase" del mismo nombre (o se crea), que es con el que se registra en Hoy: así el
 * historial de asistencia es el mismo que el de cualquier otra clase.
 */
export async function setAttending(id: string, attending: boolean): Promise<void> {
  await db.transaction("rw", db.gymClasses, db.exercises, async () => {
    const gymClass = await db.gymClasses.get(id);
    if (!isAlive(gymClass)) throw new Error("La clase no existe.");
    if (!attending) {
      await db.gymClasses.update(id, touch<GymClass>({ attending: false }));
      return;
    }
    const linked = gymClass.exerciseId ? await db.exercises.get(gymClass.exerciseId) : undefined;
    let exerciseId = isAlive(linked) ? linked.id : null;
    if (!exerciseId) {
      const existing = (await db.exercises.toArray()).find(
        (e) => isAlive(e) && e.type === "clase" && sameName(e.name, gymClass.name),
      );
      exerciseId = existing?.id ?? null;
    }
    if (!exerciseId) {
      const exercise = createRecord<Exercise>({
        name: gymClass.name,
        type: "clase",
        photoId: null,
        physioNotes: "",
        sets: 1,
        reps: null,
        durationSec: gymClass.durationMin * 60,
        targetKg: null,
        targetDistanceKm: null,
        intervalRunSec: null,
        intervalWalkSec: null,
        intervalRounds: null,
      });
      await db.exercises.add(exercise);
      exerciseId = exercise.id;
    }
    await db.gymClasses.update(id, touch<GymClass>({ attending: true, exerciseId }));
  });
  notifyLocalChange();
}

/** Si se borra un ejercicio, las clases enlazadas dejan de estar marcadas. En una transacción. */
export async function unlinkExerciseFromClasses(exerciseId: string): Promise<void> {
  const linked = await db.gymClasses.where("exerciseId").equals(exerciseId).toArray();
  for (const gymClass of linked.filter(isAlive)) {
    await db.gymClasses.update(
      gymClass.id,
      touch<GymClass>({ attending: false, exerciseId: null }),
    );
  }
}
