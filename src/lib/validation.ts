import { z } from "zod";
import { EXERCISE_TYPES } from "@/db/types";
import { MAX_KG } from "./numbers";

const optionalInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable();

/** Datos de un ejercicio tal y como los guarda la app (mismos límites que Postgres). */
export const exerciseInputSchema = z
  .object({
    name: z.string().trim().min(1, "Ponle un nombre.").max(120, "Máximo 120 caracteres."),
    type: z.enum(EXERCISE_TYPES),
    physioNotes: z.string().trim().max(4000, "Máximo 4000 caracteres."),
    sets: z.number().int().min(1, "Mínimo 1 serie.").max(20, "Máximo 20 series."),
    reps: optionalInt(1, 200),
    durationSec: optionalInt(1, 3600),
    targetKg: z.number().min(0).max(MAX_KG).nullable(),
  })
  .refine((e) => e.reps !== null || e.durationSec !== null, {
    message: "Indica repeticiones o duración.",
    path: ["reps"],
  });

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

/** Registro de peso del día. */
export const weightLogInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kg: z.number().min(0).max(MAX_KG).nullable(),
  sets: z.number().int().min(1).max(20),
  reps: optionalInt(1, 200),
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
