const WEEKDAYS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
] as const;

/** Día de la semana ISO: 1 = lunes … 7 = domingo (hora local del dispositivo). */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday - 1] ?? "";
}

/** "Jueves, 8 de octubre" */
export function weekdayLabel(date: Date): string {
  const text = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Fecha local "YYYY-MM-DD" (no UTC: entrenar a las 23:30 cuenta para ese día). */
export function localDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** 1 → "Lun" … 7 → "Dom" */
export function weekdayShort(weekday: number): string {
  return SHORT[weekday - 1] ?? "";
}
