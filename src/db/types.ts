/**
 * Modelo de datos local. Los nombres de campo están en camelCase; la capa de
 * sincronización (src/sync) los traduce a snake_case para Postgres.
 */

export const EXERCISE_TYPES = [
  "maquina",
  "peso_libre",
  "peso_corporal",
  "estiramiento",
  "clase",
  "cardio",
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/** Campos comunes a todo lo que se sincroniza con Supabase. */
export type SyncFields = {
  /** UUID generado en el dispositivo: permite crear registros sin conexión. */
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Borrado lógico: el registro se oculta y el borrado se propaga a la nube. */
  deletedAt: string | null;
  /** 1 = cambio pendiente de subir. Número (no boolean) para poder indexarlo en IndexedDB. */
  dirty: 0 | 1;
};

export type Exercise = SyncFields & {
  name: string;
  type: ExerciseType;
  photoId: string | null;
  physioNotes: string;
  sets: number;
  reps: number | null;
  /** Objetivo de tiempo (estiramiento: segundos; clase y cardio: tiempo total). */
  durationSec: number | null;
  targetKg: number | null;
  /** Cardio: distancia objetivo en km. */
  targetDistanceKm: number | null;
  /** Cardio: intervalos CaCo (caminar-correr). Los tres a la vez o ninguno. */
  intervalRunSec: number | null;
  intervalWalkSec: number | null;
  intervalRounds: number | null;
};

export type Photo = SyncFields & {
  /** Imagen redimensionada (máx. ~1200 px) y miniatura (~240 px) para listados. */
  // ArrayBuffer y no Blob: Safari no deja guardar Blobs en IndexedDB en navegación privada.
  full: ArrayBuffer;
  thumb: ArrayBuffer;
  mime: string;
  width: number;
  height: number;
};

export type WeightLog = SyncFields & {
  exerciseId: string;
  /** Fecha local "YYYY-MM-DD" del entrenamiento. */
  date: string;
  /** Opcional en peso corporal y estiramientos. */
  kg: number | null;
  sets: number;
  reps: number | null;
  /** Cardio: distancia (km), tiempo (s) y esfuerzo percibido 1–10. */
  distanceKm: number | null;
  durationSec: number | null;
  effort: number | null;
  /** "¿Cómo te has encontrado?": 0 (fatal) … 10 (perfecto). Null = sin valorar. */
  feeling: number | null;
  /** Zona con molestias (p. ej. "Rodilla"). Null = ninguna. */
  painArea: string | null;
  note: string | null;
};

export type Session = SyncFields & {
  name: string;
  photoId: string | null;
  /** Orden de los ejercicios en la sesión (en Postgres: tabla session_exercises). */
  exerciseIds: string[];
};

export type PlanEntry = SyncFields & {
  /** 1 = lunes … 7 = domingo. */
  weekday: number;
  /** Cada entrada es una sesión O un ejercicio suelto (exactamente uno de los dos). */
  sessionId: string | null;
  exerciseId: string | null;
  position: number;
  /**
   * Objetivo de ESTE día para un ejercicio de cardio (p. ej. el martes, CaCo). Todo null =
   * vale el objetivo del propio ejercicio.
   */
  targetDistanceKm: number | null;
  durationSec: number | null;
  intervalRunSec: number | null;
  intervalWalkSec: number | null;
  intervalRounds: number | null;
};

/** Una clase del horario del gimnasio, un día de la semana a una hora. */
export type GymClass = SyncFields & {
  name: string;
  /** 1 = lunes … 7 = domingo. */
  weekday: number;
  /** Hora de inicio "HH:MM" (24 h). */
  startTime: string;
  durationMin: number;
  room: string;
  instructor: string;
  /** Marcada como "voy": sale en Hoy ese día. */
  attending: boolean;
  /** Ejercicio de tipo "clase" con el que se registra (se crea al marcarla). */
  exerciseId: string | null;
};

export type MetaEntry = { key: string; value: unknown };

/** Lo que el código de la app puede rellenar al crear un registro (el resto lo pone el repositorio). */
export type NewRecord<T extends SyncFields> = Omit<T, keyof SyncFields>;
