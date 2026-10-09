import { describe, expect, it } from "vitest";
import { loginRedirectUrl, normalizeEmail, sendLoginLink } from "./auth";

describe("login", () => {
  it("normaliza el email y rechaza los no válidos", () => {
    expect(normalizeEmail("  Ana@Example.COM ")).toBe("ana@example.com");
    for (const bad of ["no-es-email", "a@b", "a b@c.es", "@c.es", ""]) {
      expect(normalizeEmail(bad), bad).toBeNull();
    }
  });

  it("el enlace vuelve a la raíz de la app", () => {
    expect(loginRedirectUrl("https://bealacasa.github.io")).toBe(
      `https://bealacasa.github.io${import.meta.env.BASE_URL}`,
    );
  });

  it("sin nube configurada no intenta conectar", async () => {
    expect(await sendLoginLink("ana@example.com")).toEqual({
      ok: false,
      error: "La nube aún no está configurada.",
    });
  });
});
