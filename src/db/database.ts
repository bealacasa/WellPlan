import Dexie, { type EntityTable } from "dexie";
import type { Exercise, GymClass, MetaEntry, Photo, PlanEntry, Session, WeightLog } from "./types";

/**
 * Base de datos local (IndexedDB vía Dexie). Es la fuente de verdad de la interfaz:
 * la app lee y escribe aquí siempre, y src/sync sube y baja los cambios cuando hay red.
 *
 * Para cambiar el esquema: añade una nueva `this.version(n + 1)` (nunca edites una versión
 * publicada) y, si hace falta, una función `.upgrade()` que migre los datos.
 */
export class WellPlanDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  photos!: EntityTable<Photo, "id">;
  weightLogs!: EntityTable<WeightLog, "id">;
  sessions!: EntityTable<Session, "id">;
  planEntries!: EntityTable<PlanEntry, "id">;
  gymClasses!: EntityTable<GymClass, "id">;
  meta!: EntityTable<MetaEntry, "key">;

  constructor(name = "wellplan") {
    super(name);
    this.version(1).stores({
      exercises: "id, name, updatedAt, dirty",
      photos: "id, dirty",
      // Índice compuesto para "último peso de este ejercicio" e historial ordenado por fecha.
      weightLogs: "id, exerciseId, [exerciseId+date], date, dirty",
      sessions: "id, name, dirty",
      planEntries: "id, weekday, sessionId, dirty",
      meta: "key",
    });

    // v2: cardio (distancia, tiempo, esfuerzo, intervalos CaCo) y ejercicios sueltos en el plan.
    // Los datos ya guardados reciben los campos nuevos a null; no se marcan para subir.
    this.version(2)
      .stores({ planEntries: "id, weekday, sessionId, exerciseId, dirty" })
      .upgrade(async (tx) => {
        await tx
          .table("exercises")
          .toCollection()
          .modify((e) => {
            e.targetDistanceKm ??= null;
            e.intervalRunSec ??= null;
            e.intervalWalkSec ??= null;
            e.intervalRounds ??= null;
          });
        await tx
          .table("weightLogs")
          .toCollection()
          .modify((l) => {
            l.distanceKm ??= null;
            l.durationSec ??= null;
            l.effort ??= null;
          });
        await tx
          .table("planEntries")
          .toCollection()
          .modify((p) => {
            p.exerciseId ??= null;
          });
      });

    // v3: horario de clases del gimnasio (tabla nueva, sin datos que migrar).
    this.version(3).stores({ gymClasses: "id, weekday, exerciseId, dirty" });
  }
}

export const db = new WellPlanDB();

/** Tablas que se sincronizan con Supabase (todas salvo meta). */
export const SYNCED_TABLES = [
  "exercises",
  "photos",
  "weightLogs",
  "sessions",
  "planEntries",
  "gymClasses",
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];
