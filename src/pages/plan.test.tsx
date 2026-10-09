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
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/ejercicios"] });
    render(<RouterProvider router={memory} />);

    // Las sesiones están dentro de la pestaña Ejercicios.
    await user.click(await screen.findByRole("link", { name: "Sesiones" }));
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

    // Vuelve a la lista de sesiones; luego, en el plan, se asigna al lunes.
    expect(await screen.findByText(/2 ejercicios · sin día asignado/)).toBeTruthy();
    await memory.navigate("/plan");
    const monday = await screen.findByLabelText("Añadir al lunes");
    const session = (await db.sessions.toArray())[0]!;
    expect(session.exerciseIds.length).toBe(2);
    await user.selectOptions(monday, `s:${session.id}`);
    expect(
      await screen.findByRole("button", { name: "Quitar Pierna + core del lunes" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Quitar Pierna + core del lunes" }));
    await vi.waitFor(async () =>
      expect((await db.planEntries.toArray()).every((e) => e.deletedAt !== null)).toBe(true),
    );
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

describe("Hoy con sesiones plegables", () => {
  it("empiezan plegadas con el siguiente ejercicio y se despliegan al tocarlas", async () => {
    const { createSession } = await import("@/db/repositories/sessions");
    const { addToDay } = await import("@/db/repositories/plan");
    const { isoWeekday } = await import("@/lib/dates");
    const ids = [await exercise("Sentadilla"), await exercise("Hip thrust")];
    const sessionId = await createSession({ name: "Glúteo", exerciseIds: ids });
    await addToDay(isoWeekday(new Date()), { sessionId });
    sessionStorage.clear();

    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    const header = await screen.findByRole("button", { name: /Glúteo/ });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.textContent).toContain("Siguiente: Sentadilla");
    expect(screen.queryByRole("list", { name: "Glúteo" })).toBeNull();

    await user.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    const list = screen.getByRole("list", { name: "Glúteo" });
    expect(within(list).getAllByRole("link")).toHaveLength(2);
  });
});

describe("horario del gimnasio", () => {
  it("añadir una clase en dos días, marcar «voy» y verla en Hoy", async () => {
    const { isoWeekday } = await import("@/lib/dates");
    const today = isoWeekday(new Date());
    const other = today === 7 ? 1 : today + 1;
    const user = userEvent.setup();
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/horario"] });
    render(<RouterProvider router={memory} />);

    await user.click(await screen.findByRole("link", { name: "+ Añadir clase" }));
    await user.type(await screen.findByLabelText("Nombre"), "Pilates");
    const { weekdayName } = await import("@/lib/dates");
    await user.click(screen.getByLabelText(weekdayName(other)));
    await user.type(screen.getByLabelText("Hora de inicio"), "18:30");
    await user.click(screen.getByRole("button", { name: "45 min" }));
    await user.type(screen.getByLabelText("Sala (opcional)"), "Sala 2");
    await user.click(screen.getByRole("button", { name: "Añadir al horario" }));

    const going = await screen.findByRole("button", { name: "Voy a Pilates a las 18:30" });
    expect(going.getAttribute("aria-pressed")).toBe("false");
    expect(await db.gymClasses.count()).toBe(2);
    await user.click(going);
    await vi.waitFor(() => expect(going.getAttribute("aria-pressed")).toBe("true"));

    await memory.navigate("/");
    const list = await screen.findByRole("list", { name: "Pilates" });
    expect(list.closest("section")?.textContent).toContain("45 min · Sala 2");
  });

  it("no deja añadir una clase sin hora", async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider
        router={createMemoryRouter(router.routes, { initialEntries: ["/horario/nueva"] })}
      />,
    );
    await user.type(await screen.findByLabelText("Nombre"), "Yoga");
    await user.click(screen.getByRole("button", { name: "Añadir al horario" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Indica la hora de inicio.");
    expect(await db.gymClasses.count()).toBe(0);
  });
});
