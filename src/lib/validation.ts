import { z } from "zod";
import { EXERCISE_TYPES } from "@/db/types";
import { MAX_KG, MAX_KM } from "./numbers";

const optionalInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable();

/** Datos de un ejercicio tal y como los guarda la app (mismos límites que Postgres). */
export const exerciseInputSchema = z
  .object({
    name: z.string().trim().min(1, "Ponle un nombre.").max(120, "Máximo 120 caracteres."),
    type: z.enum(EXERCISE_TYPES),
    physioNotes: z.string().trim().max(4000, "Máximo 4000 caracteres."),
    sets: z.number().int().min(1, "Mínimo 1 serie.").max(20, "Máximo 20 series."),
    reps: optionalInt(1, 200),
    durationSec: optionalInt(1, 10800),
    targetKg: z.number().min(0).max(MAX_KG).nullable(),
    targetDistanceKm: z.number().min(0).max(MAX_KM).nullable().default(null),
    intervalRunSec: optionalInt(1, 3600).default(null),
    intervalWalkSec: optionalInt(0, 3600).default(null),
    intervalRounds: optionalInt(1, 100).default(null),
  })
  // En cardio el objetivo es opcional (distancia, tiempo o intervalos); en el resto, no.
  .refine((e) => e.type === "cardio" || e.reps !== null || e.durationSec !== null, {
    message: "Indica repeticiones o duración.",
    path: ["reps"],
  })
  .refine(
    (e) =>
      [e.intervalRunSec, e.intervalWalkSec, e.intervalRounds].every((x) => x === null) ||
      [e.intervalRunSec, e.intervalWalkSec, e.intervalRounds].every((x) => x !== null),
    {
      message: "Completa los intervalos (correr, andar y repeticiones).",
      path: ["intervalRunSec"],
    },
  );

export type ExerciseInput = z.input<typeof exerciseInputSchema>;

/** Registro de peso del día. */
export const weightLogInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().min(0).max(MAX_KG).nullable(),
  sets: z.number().int().min(1).max(20),
  reps: optionalInt(1, 200),
  // Cardio: opcionales (el resto de tipos no los usa).
  distanceKm: z.number().min(0).max(MAX_KM).nullable().default(null),
  durationSec: optionalInt(1, 86400).default(null),
  effort: optionalInt(1, 10).default(null),
  note: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres.")
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export type WeightLogInput = z.input<typeof weightLogInputSchema>;

/** Sesión: nombre y lista ordenada de ejercicios (sin repetidos; máx. 100, como en Postgres). */
export const sessionInputSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a la sesión.").max(80, "Máximo 80 caracteres."),
  exerciseIds: z
    .array(z.uuid())
    .max(100, "Máximo 100 ejercicios por sesión.")
    .refine((ids) => new Set(ids).size === ids.length, "Hay ejercicios repetidos."),
});

export type SessionInput = z.infer<typeof sessionInputSchema>;

/** Clase del horario del gimnasio (mismos límites que en Postgres). */
export const gymClassInputSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a la clase.").max(80, "Máximo 80 caracteres."),
  weekday: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Indica la hora de inicio."),
  durationMin: z.number().int().min(5, "Mínimo 5 minutos.").max(300, "Máximo 300 minutos."),
  room: z.string().trim().max(60, "Máximo 60 caracteres."),
  instructor: z.string().trim().max(60, "Máximo 60 caracteres."),
});

export type GymClassInput = z.infer<typeof gymClassInputSchema>;

/** Objetivo de cardio de un día del plan (todo null = el del ejercicio). */
export const dayTargetSchema = z
  .object({
    targetDistanceKm: z.number().min(0).max(MAX_KM).nullable(),
    durationSec: optionalInt(1, 10800),
    intervalRunSec: optionalInt(1, 3600),
    intervalWalkSec: optionalInt(0, 3600),
    intervalRounds: optionalInt(1, 100),
  })
  .refine(
    (t) =>
      [t.intervalRunSec, t.intervalWalkSec, t.intervalRounds].every((x) => x === null) ||
      [t.intervalRunSec, t.intervalWalkSec, t.intervalRounds].every((x) => x !== null),
    {
      message: "Completa los intervalos (correr, andar y repeticiones).",
      path: ["intervalRunSec"],
    },
  );

export type DayTarget = z.infer<typeof dayTargetSchema>;
