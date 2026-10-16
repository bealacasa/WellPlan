import type { GymClass, PlanEntry } from "@/db/types";
import { isoWeekday, localDateKey } from "./dates";

type EntryLike = Pick<PlanEntry, "weekday" | "createdAt" | "deletedAt">;
type ClassLike = Pick<GymClass, "weekday" | "attending" | "deletedAt">;

/** Fecha local "YYYY-MM-DD" de una marca de tiempo ISO. */
const dayOf = (iso: string) => localDateKey(new Date(iso));

/**
 * ¿Había algo planificado ese día? Los días que ya han pasado se vacían del plan
 * (`clearPastDays`), así que para el pasado se mira el plan TAL COMO ERA ese día: entradas
 * creadas hasta ese día y no borradas antes. Hoy y lo que queda, el plan actual. Las
 * clases marcadas con "Voy" cuentan siempre (no se vacían).
 */
export function plannedOn(
  entries: readonly EntryLike[],
  classes: readonly ClassLike[],
  today: Date,
): (date: Date) => boolean {
  const todayKey = localDateKey(today);
  const classDays = new Set(
    classes.filter((c) => c.deletedAt === null && c.attending).map((c) => c.weekday),
  );
  return (date) => {
    const weekday = isoWeekday(date);
    if (classDays.has(weekday)) return true;
    const key = localDateKey(date);
    return entries.some((e) => {
      if (e.weekday !== weekday) return false;
      if (key >= todayKey) return e.deletedAt === null;
      return dayOf(e.createdAt) <= key && (e.deletedAt === null || dayOf(e.deletedAt) > key);
    });
  };
}
