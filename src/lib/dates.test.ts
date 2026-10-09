import { describe, expect, it } from "vitest";
import { isoWeekday, localDateKey, weekdayLabel, weekdayName } from "./dates";

describe("fechas", () => {
  it("lunes = 1 y domingo = 7", () => {
    expect(isoWeekday(new Date(2026, 9, 5))).toBe(1); // lunes 5 oct 2026
    expect(isoWeekday(new Date(2026, 9, 11))).toBe(7); // domingo
    expect(weekdayName(3)).toBe("miércoles");
  });

  it("usa la fecha local, no UTC", () => {
    expect(localDateKey(new Date(2026, 0, 2, 23, 45))).toBe("2026-01-02");
  });

  it("etiqueta en español con mayúscula inicial", () => {
    expect(weekdayLabel(new Date(2026, 9, 8))).toBe("Jueves, 8 de octubre");
  });
});
