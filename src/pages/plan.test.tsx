import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/database";
import { createExercise } from "@/db/repositories/exercises";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

const { router } = await import("@/app/router");

const exercise = (name: string) =>
  createExercise({
    name,
    type: "maquina",
    physioNotes: "",
    sets: 3,
    reps: 12,
    durationSec: null,
    targetKg: null,
  });

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("sesiones y plan", () => {
  it("crear una sesión, ordenar con ↑/↓, asignarla al lunes y quitarla", async () => {
    await exercise("Prensa");
    await exercise("Plancha");
    const user = userEvent.setup();
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/plan"] });
    render(<RouterProvider router={memory} />);

    await user.click(await screen.findByRole("link", { name: "+ Nueva sesión" }));
    await user.type(await screen.findByLabelText("Nombre"), "Pierna + core");
    await user.click(screen.getByRole("button", { name: /Prensa/ }));
    await user.click(screen.getByRole("button", { name: /Plancha/ }));

    const order = () =>
      within(screen.getByRole("list", { name: /Ejercicios, en orden/ }))
        .getAllByRole("listitem")
        .map((li) => li.textContent);
    expect(order()[0]).toContain("Prensa");
    await user.click(screen.getByRole("button", { name: "Subir Plancha" }));
    expect(order()[0]).toContain("Plancha");

    await user.click(screen.getByRole("button", { name: "Guardar sesión" }));

    // Vuelve al plan: asignar al lunes con el selector.
    const monday = await screen.findByLabelText("Añadir al lunes");
    const session = (await db.sessions.toArray())[0]!;
    expect(session.exerciseIds.length).toBe(2);
    await user.selectOptions(monday, `s:${session.id}`);
    expect(
      await screen.findByRole("button", { name: "Quitar Pierna + core del lunes" }),
    ).toBeTruthy();
    expect(screen.getByText(/2 ejercicios · Lun/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Quitar Pierna + core del lunes" }));
    expect(await screen.findByText(/2 ejercicios · sin día asignado/)).toBeTruthy();
  });

  it("no deja guardar una sesión sin ejercicios", async () => {
    const user = userEvent.setup();
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/sesiones/nueva"] });
    render(<RouterProvider router={memory} />);
    await user.type(await screen.findByLabelText("Nombre"), "Vacía");
    await user.click(screen.getByRole("button", { name: "Guardar sesión" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Añade al menos un ejercicio.");
    expect(await db.sessions.count()).toBe(0);
  });
});
