import { describe, expect, it, vi } from "vitest";
import { isStandalone, requestPersistence } from "./storage";

const nav = (storage: Partial<StorageManager> | undefined) => ({ storage }) as unknown as Navigator;

describe("requestPersistence", () => {
  it("no vuelve a pedirlo si ya está concedido", async () => {
    const persist = vi.fn();
    const result = await requestPersistence(nav({ persisted: async () => true, persist }));
    expect(result).toBe("persisted");
    expect(persist).not.toHaveBeenCalled();
  });

  it("informa si el navegador lo deniega", async () => {
    const result = await requestPersistence(
      nav({ persisted: async () => false, persist: async () => false }),
    );
    expect(result).toBe("denied");
  });

  it("detecta navegadores sin la API", async () => {
    expect(await requestPersistence(nav(undefined))).toBe("unsupported");
  });
});

describe("isStandalone", () => {
  it("detecta la app instalada en iOS", () => {
    const win = { navigator: { standalone: true }, matchMedia: () => ({ matches: false }) };
    expect(isStandalone(win as unknown as Window)).toBe(true);
  });

  it("en el navegador no es standalone", () => {
    const win = { navigator: {}, matchMedia: () => ({ matches: false }) };
    expect(isStandalone(win as unknown as Window)).toBe(false);
  });
});
