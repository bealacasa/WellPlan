import { describe, expect, it } from "vitest";
import { emailSchema, loginRedirectUrl, sendLoginLink } from "./auth";

describe("login", () => {
  it("normaliza el email y rechaza los no válidos", () => {
    expect(emailSchema.parse("  Ana@Example.COM ")).toBe("ana@example.com");
    expect(emailSchema.safeParse("no-es-email").success).toBe(false);
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
