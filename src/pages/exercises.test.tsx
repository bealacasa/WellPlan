import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/database";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

const { router } = await import("@/app/router");

function renderAt(path: string) {
  const memory = createMemoryRouter(router.routes, { initialEntries: [path] });
  render(<RouterProvider router={memory} />);
  return memory;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("flujo de ejercicios", () => {
  it("crear, registrar el peso de hoy con ±2,5 y ver el historial", async () => {
    const user = userEvent.setup();
    renderAt("/ejercicios");

    await user.click(await screen.findByRole("link", { name: "+ Añadir ejercicio" }));
    await user.type(await screen.findByLabelText("Nombre"), "Prensa de piernas");
    await user.type(screen.getByLabelText("Indicaciones de la fisio"), "No bloquear rodillas");
    const target = screen.getByLabelText("Peso objetivo (opcional)");
    await user.clear(target);
    await user.type(target, "20");
    await user.click(screen.getByRole("button", { name: "Guardar ejercicio" }));

    // Ficha del ejercicio: el formulario rápido parte del peso objetivo.
    expect(
      await screen.findByRole("heading", { name: "Prensa de piernas", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText("No bloquear rodillas")).toBeTruthy();
    const kg = screen.getByLabelText("Peso") as HTMLInputElement;
    expect(kg.value).toBe("20");

    await user.click(screen.getByRole("button", { name: "Sumar 2,5 kilos" }));
    expect(kg.value).toBe("22,5");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("✓ Guardado: 22,5 kg")).toBeTruthy();
    const history = await screen.findByRole("heading", { name: "Historial" });
    expect(within(history.parentElement!).getByText(/22,5 kg · 3 × 12/)).toBeTruthy();
    // El siguiente registro se rellena con el último peso usado.
    expect((screen.getByLabelText("Peso") as HTMLInputElement).value).toBe("22,5");
  });

  it("rechaza kilos no válidos sin guardar", async () => {
    const user = userEvent.setup();
    renderAt("/ejercicios/nuevo");
    await user.type(await screen.findByLabelText("Nombre"), "Curl");
    await user.click(screen.getByRole("button", { name: "Guardar ejercicio" }));

    const kg = await screen.findByLabelText("Peso");
    await user.clear(kg);
    await user.type(kg, "mucho");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Escribe los kilos (por ejemplo 22,5).",
    );
    expect(await db.weightLogs.count()).toBe(0);
  });

  it("pide confirmación antes de borrar un ejercicio", async () => {
    const user = userEvent.setup();
    renderAt("/ejercicios/nuevo");
    await user.type(await screen.findByLabelText("Nombre"), "Remo");
    await user.click(screen.getByRole("button", { name: "Guardar ejercicio" }));
    await user.click(await screen.findByRole("link", { name: "Editar ejercicio" }));

    await user.click(await screen.findByRole("button", { name: "Borrar ejercicio" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect((await db.exercises.toArray())[0]?.deletedAt).toBeNull();

    await user.click(screen.getByRole("button", { name: "Borrar ejercicio" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Borrar ejercicio" }),
    );
    expect(await screen.findByText("Todavía no hay ejercicios")).toBeTruthy();
  });
});
