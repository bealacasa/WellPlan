import { describe, expect, it } from "vitest";
import { codeSchema, emailSchema, sendCode } from "./auth";

describe("validación del login", () => {
  it("normaliza el email y rechaza los no válidos", () => {
    expect(emailSchema.parse("  Ana@Example.COM ")).toBe("ana@example.com");
    expect(emailSchema.safeParse("no-es-email").success).toBe(false);
  });

  it("el código solo admite dígitos", () => {
    expect(codeSchema.safeParse("123456").success).toBe(true);
    expect(codeSchema.safeParse("12ab56").success).toBe(false);
  });

  it("sin nube configurada no intenta conectar", async () => {
    expect(await sendCode("ana@example.com")).toEqual({
      ok: false,
      error: "La nube aún no está configurada.",
    });
  });
});
