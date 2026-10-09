import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function renderCard(persisted: boolean) {
  vi.stubGlobal("navigator", {
    ...navigator,
    storage: { persisted: async () => persisted, persist: async () => persisted },
  });
  const { AlertsCard } = await import("./AlertsCard");
  render(<AlertsCard />);
}

describe("avisos", () => {
  it("avisa si el navegador puede borrar los datos y no hay nube", async () => {
    await renderCard(false);
    expect(await screen.findByText(/el navegador podría borrarlos/)).toBeTruthy();
    expect(screen.getByText("Instálala en la pantalla de inicio")).toBeTruthy();
  });

  it("sin riesgo si el almacenamiento está protegido", async () => {
    await renderCard(true);
    expect(await screen.findByText("Almacenamiento protegido")).toBeTruthy();
    expect(screen.queryByText(/el navegador podría borrarlos/)).toBeNull();
  });
});
