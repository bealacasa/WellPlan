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

    // El aviso "✓ Guardado" se oculta a los 3 s: comprobamos lo que persiste (BD e historial).
    await vi.waitFor(async () => expect((await db.weightLogs.toArray())[0]?.kg).toBe(22.5), {
      timeout: 5000,
    });
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

describe("tipo clase", () => {
  it("se mide en minutos y sin series, y se registra como hecha", async () => {
    const user = userEvent.setup();
    renderAt("/ejercicios/nuevo");
    await user.type(await screen.findByLabelText("Nombre"), "Pilates");
    await user.click(screen.getByLabelText("Clase"));
    expect(screen.queryByLabelText("Series")).toBeNull();
    expect((screen.getByLabelText("Duración (minutos)") as HTMLInputElement).value).toBe("60");
    await user.click(screen.getByRole("button", { name: "Guardar ejercicio" }));

    expect(await screen.findByText(/Clase · 60 min/)).toBeTruthy();
    expect(screen.queryByLabelText("Peso")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Marcar como hecha" }));
    await vi.waitFor(async () => expect(await db.weightLogs.count()).toBe(1), { timeout: 5000 });
    const stored = (await db.exercises.toArray())[0]!;
    expect(stored).toMatchObject({ type: "clase", sets: 1, durationSec: 3600, reps: null });
  });
});

describe("peso corporal por tiempo", () => {
  it("una plancha se mide en segundos y se registra el tiempo aguantado", async () => {
    const user = userEvent.setup();
    renderAt("/ejercicios/nuevo");
    await user.type(await screen.findByLabelText("Nombre"), "Plancha frontal");
    await user.click(screen.getByLabelText("Peso corporal"));
    await user.click(screen.getByRole("radio", { name: "Tiempo" }));
    expect((screen.getByLabelText("Duración (segundos)") as HTMLInputElement).value).toBe("30");
    await user.click(screen.getByRole("button", { name: "Guardar ejercicio" }));

    expect(await screen.findByText(/3 × 30 s/)).toBeTruthy();
    const stored = (await db.exercises.toArray())[0]!;
    expect(stored).toMatchObject({ type: "peso_corporal", reps: null, durationSec: 30 });

    expect((screen.getByLabelText("Segundos") as HTMLInputElement).value).toBe("30");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await vi.waitFor(async () => expect(await db.weightLogs.count()).toBe(1), { timeout: 5000 });
    expect((await db.weightLogs.toArray())[0]).toMatchObject({ durationSec: 30, reps: null });
  });
});
