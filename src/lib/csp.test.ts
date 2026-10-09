import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  it("no permite inline, eval ni recursos de terceros", () => {
    const csp = buildCsp("https://abc.supabase.co");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
  });

  it("solo permite conectar con el propio origen y el proyecto de Supabase", () => {
    expect(buildCsp("https://abc.supabase.co/rest/v1")).toContain(
      "connect-src 'self' https://abc.supabase.co;",
    );
    expect(buildCsp()).toContain("connect-src 'self';");
  });

  it("admite fotos locales (blob:)", () => {
    expect(buildCsp()).toContain("img-src 'self' blob: data:");
  });
});
