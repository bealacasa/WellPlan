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
    await screen.findByRole("button", { name: "Voy a Pilates a las 18:30" });
    expect(await db.gymClasses.count()).toBe(2);

    // El horario muestra el primer día de la semana elegido (el domingo, eso es el lunes):
    // se va al día de hoy para marcar «Voy» en la clase de hoy.
    await memory.navigate(`/horario?dia=${today}`);
    await screen.findByRole("heading", { name: weekdayName(today), level: 2 });
    const going = screen.getByRole("button", { name: "Voy a Pilates a las 18:30" });
    expect(going.getAttribute("aria-pressed")).toBe("false");
    await user.click(going);
    await vi.waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Voy a Pilates a las 18:30" })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );

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

describe("objetivo del día para cardio", () => {
  it("al añadir correr a un día se elige su objetivo (con CaCo) y se ve en el plan", async () => {
    const { createExercise } = await import("@/db/repositories/exercises");
    const id = await createExercise({
      name: "Correr",
      type: "cardio",
      physioNotes: "",
      sets: 1,
      reps: null,
      durationSec: null,
      targetKg: null,
      targetDistanceKm: 5,
    });
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/plan"] })} />,
    );
    await user.selectOptions(await screen.findByLabelText("Añadir al martes"), `e:${id}`);

    expect(await screen.findByText("Objetivo del martes")).toBeTruthy();
    // Parte del objetivo habitual del ejercicio.
    expect((screen.getByLabelText("Distancia (km)") as HTMLInputElement).value).toBe("5");
    await user.clear(screen.getByLabelText("Distancia (km)"));
    await user.click(screen.getByLabelText("Intervalos CaCo (caminar-correr)"));
    await user.click(screen.getByRole("button", { name: "Guardar objetivo del martes" }));

    expect(await screen.findByText("Hoy toca: 8 × (2′ correr + 1′ andar)")).toBeTruthy();
    const entry = (await db.planEntries.toArray())[0]!;
    expect(entry).toMatchObject({
      weekday: 2,
      targetDistanceKm: null,
      intervalRunSec: 120,
      intervalWalkSec: 60,
      intervalRounds: 8,
    });
    // El ejercicio conserva su objetivo de siempre.
    expect((await db.exercises.get(id))?.targetDistanceKm).toBe(5);
  });
});

describe("clases en el plan", () => {
  it("se pueden quitar del día (dejan de estar marcadas) sin borrarlas del horario", async () => {
    const { createGymClasses, setAttending } = await import("@/db/repositories/gymClasses");
    const [id] = await createGymClasses(
      { name: "Pilates", startTime: "18:15", durationMin: 45, room: "", instructor: "" },
      [2],
    );
    await setAttending(id!, true);
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/plan"] })} />,
    );
    await user.click(
      await screen.findByRole("button", { name: "Quitar la clase de Pilates del martes" }),
    );
    await vi.waitFor(async () =>
      expect(await db.gymClasses.get(id!)).toMatchObject({ attending: false, deletedAt: null }),
    );
  });
});

describe("pantalla de progreso", () => {
  it("se abre desde Hoy y muestra la semana", async () => {
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { localDateKey } = await import("@/lib/dates");
    const id = await exercise("Prensa");
    await addLog(id, { date: localDateKey(new Date()), kg: 20, sets: 3, reps: 12, note: null });
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    await user.click(await screen.findByRole("link", { name: /Tu progreso/ }));
    expect(await screen.findByRole("heading", { name: "Progreso", level: 1 })).toBeTruthy();
    const week = screen.getByRole("heading", { name: "Esta semana" }).closest("section");
    expect(within(week as HTMLElement).getByText("1 día")).toBeTruthy();
    expect(screen.getByText(/Racha: 1 semana/)).toBeTruthy();
    // Calendario del mes: hoy aparece como entrenado.
    expect(screen.getByRole("link", { name: /\(hoy\): entrenado/ })).toBeTruthy();
  });
});

describe("registro rápido desde Hoy", () => {
  it("✓ registra igual que la última vez, sugiere subir peso y se puede deshacer", async () => {
    const { addToDay } = await import("@/db/repositories/plan");
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { isoWeekday } = await import("@/lib/dates");
    const id = await exercise("Prensa");
    await addToDay(isoWeekday(new Date()), { exerciseId: id });
    for (const date of ["2026-01-05", "2026-01-07"]) {
      await addLog(id, { date, kg: 20, sets: 3, reps: 12, note: null });
    }
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    expect(await screen.findByText("Última: 20 kg · 3 × 12")).toBeTruthy();
    expect(screen.getByText("↑ Prueba 22,5 kg")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Registrar Prensa: 20 kg · 3 × 12" }));
    expect(await screen.findByRole("button", { name: "Hecho hoy. Desmarcar Prensa" })).toBeTruthy();
    const today = (await db.weightLogs.toArray()).filter((l) => l.date > "2026-01-07");
    expect(today).toHaveLength(1);
    expect(today[0]).toMatchObject({ kg: 20, sets: 3, reps: 12 });

    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(
      await screen.findByRole("button", { name: "Registrar Prensa: 20 kg · 3 × 12" }),
    ).toBeTruthy();
  });

  it("en la ficha, el botón de la sugerencia pone el peso nuevo", async () => {
    const { addLog } = await import("@/db/repositories/weightLogs");
    const id = await exercise("Prensa");
    for (const date of ["2026-01-05", "2026-01-07"]) {
      await addLog(id, { date, kg: 20, sets: 3, reps: 12, note: null });
    }
    const user = userEvent.setup();
    render(
      <RouterProvider
        router={createMemoryRouter(router.routes, { initialEntries: [`/hoy/${id}`] })}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "↑ Probar con 22,5 kg" }));
    expect((screen.getByLabelText("Peso") as HTMLInputElement).value).toBe("22,5");
  });
});

describe("desmarcar y molestias en Hoy", () => {
  it("el ✓ relleno desmarca lo hecho hoy, y se puede deshacer", async () => {
    const { addToDay } = await import("@/db/repositories/plan");
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { isoWeekday, localDateKey } = await import("@/lib/dates");
    const id = await exercise("Prensa");
    await addToDay(isoWeekday(new Date()), { exerciseId: id });
    await addLog(id, { date: localDateKey(new Date()), kg: 20, sets: 3, reps: 12, note: null });
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    await user.click(await screen.findByRole("button", { name: "Hecho hoy. Desmarcar Prensa" }));
    await vi.waitFor(async () =>
      expect((await db.weightLogs.toArray()).every((l) => l.deletedAt !== null)).toBe(true),
    );
    await user.click(await screen.findByRole("button", { name: "Deshacer" }));
    expect(await screen.findByRole("button", { name: "Hecho hoy. Desmarcar Prensa" })).toBeTruthy();
    expect((await db.weightLogs.toArray())[0]?.deletedAt).toBeNull();
  });

  it("si la última vez hubo molestias no hay ✓ rápido y se avisa", async () => {
    const { addToDay } = await import("@/db/repositories/plan");
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { isoWeekday } = await import("@/lib/dates");
    const id = await exercise("Prensa");
    await addToDay(isoWeekday(new Date()), { exerciseId: id });
    await addLog(id, {
      date: "2026-01-05",
      kg: 20,
      sets: 3,
      reps: 12,
      feeling: null,
      painArea: null,
      note: "Me molestó la rodilla",
    });
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    expect(await screen.findByText("Nota la última vez")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Registrar Prensa/ })).toBeNull();
  });

  it("en fuerza solo hay nota (sin sensación ni zona)", async () => {
    const id = await exercise("Prensa");
    render(
      <RouterProvider
        router={createMemoryRouter(router.routes, { initialEntries: [`/hoy/${id}`] })}
      />,
    );
    expect(await screen.findByLabelText("Nota (opcional)")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sensación 5 de 10" })).toBeNull();
  });

  it("en una clase se registra la sensación y la zona, y aparece en el historial", async () => {
    const { createExercise } = await import("@/db/repositories/exercises");
    const id = await createExercise({
      name: "Pilates",
      type: "clase",
      physioNotes: "",
      sets: 1,
      reps: null,
      durationSec: 3600,
      targetKg: null,
    });
    const user = userEvent.setup();
    render(
      <RouterProvider
        router={createMemoryRouter(router.routes, { initialEntries: [`/hoy/${id}`] })}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Sensación 5 de 10" }));
    await user.click(screen.getByRole("button", { name: "Rodilla" }));
    await user.click(screen.getByRole("button", { name: "Marcar como hecha" }));
    expect(await screen.findByText("Sensación 5/10 · molestia en rodilla")).toBeTruthy();
    expect((await db.weightLogs.toArray())[0]).toMatchObject({ feeling: 5, painArea: "Rodilla" });
  });
});

describe("informe para el fisio", () => {
  it("se abre desde Progreso y muestra las molestias", async () => {
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { localDateKey } = await import("@/lib/dates");
    const id = await exercise("Prensa");
    await addLog(id, {
      date: localDateKey(new Date()),
      kg: 20,
      sets: 3,
      reps: 12,
      feeling: 3,
      painArea: "Lumbar",
      note: null,
    });
    const user = userEvent.setup();
    render(
      <RouterProvider
        router={createMemoryRouter(router.routes, { initialEntries: ["/progreso"] })}
      />,
    );
    await user.click(await screen.findByRole("link", { name: "Informe para el fisio" }));
    expect(await screen.findByText("Sensación 3/10 · molestia en lumbar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compartir informe" })).toBeTruthy();
  });
});

describe("apuntar en un día pasado desde Progreso", () => {
  it("un ejercicio con kilos se apunta en ese día; el cardio abre su registro con esa fecha", async () => {
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { createExercise } = await import("@/db/repositories/exercises");
    const { addDays, localDateKey } = await import("@/lib/dates");
    const day = localDateKey(addDays(new Date(), -3));
    const remo = await exercise("Remo");
    await addLog(remo, { date: "2026-01-05", kg: 25, sets: 3, reps: 12, note: null });
    const correr = await createExercise({
      name: "Correr",
      type: "cardio",
      physioNotes: "",
      sets: 1,
      reps: null,
      durationSec: null,
      targetKg: null,
    });
    const user = userEvent.setup();
    render(
      <RouterProvider
        router={createMemoryRouter(router.routes, { initialEntries: [`/progreso/dia/${day}`] })}
      />,
    );
    const select = await screen.findByLabelText("Apuntar algo hecho este día");
    await user.selectOptions(select, `e:${remo}`);
    expect(await screen.findByText("Remo", { ignore: "option, script, style" })).toBeTruthy();
    const onDay = (await db.weightLogs.toArray()).filter((l) => l.date === day);
    expect(onDay[0]).toMatchObject({ exerciseId: remo, kg: 25 });

    await user.selectOptions(screen.getByLabelText("Apuntar algo hecho este día"), `e:${correr}`);
    expect(await screen.findByRole("heading", { name: /^Registrar el / })).toBeTruthy();
    await user.type(screen.getByLabelText(/Distancia/), "4");
    await user.click(screen.getByRole("button", { name: /Guardar/ }));
    await vi.waitFor(async () =>
      expect(
        (await db.weightLogs.toArray()).some((l) => l.exerciseId === correr && l.date === day),
      ).toBe(true),
    );
    // «←» vuelve al día de Progreso.
    expect(screen.getByRole("link", { name: "← Progreso" }).getAttribute("href")).toContain(
      `/progreso/dia/${day}`,
    );
  });
});

describe("volver a Progreso", () => {
  it("al abrir un ejercicio desde Progreso, «←» vuelve a Progreso", async () => {
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { localDateKey } = await import("@/lib/dates");
    const id = await exercise("Prensa");
    await addLog(id, { date: localDateKey(new Date()), kg: 20, sets: 3, reps: 12, note: null });
    const user = userEvent.setup();
    render(
      <RouterProvider
        router={createMemoryRouter(router.routes, { initialEntries: ["/progreso"] })}
      />,
    );
    const card = (await screen.findByRole("heading", { name: "Ejercicios este mes" })).closest(
      "section",
    );
    await user.click(within(card as HTMLElement).getByRole("link", { name: /Prensa/ }));
    await user.click(await screen.findByRole("link", { name: "← Progreso" }));
    expect(await screen.findByRole("heading", { name: "Progreso", level: 1 })).toBeTruthy();
  });
});

describe("algo hecho que no estaba en el plan", () => {
  it("una sesión se apunta como hecha (lo que se puede de un toque), sin tocar el plan, y se puede quitar", async () => {
    const { createExercise } = await import("@/db/repositories/exercises");
    const { createSession } = await import("@/db/repositories/sessions");
    const prensa = await exercise("Prensa"); // sin kilos: hay que registrarla a mano
    const puente = await createExercise({
      name: "Puente",
      type: "peso_corporal",
      physioNotes: "",
      sets: 3,
      reps: 12,
      durationSec: null,
      targetKg: null,
    });
    await createSession({ name: "Glúteo", exerciseIds: [prensa, puente] });
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    const select = await screen.findByLabelText("Apuntar algo hecho hoy que no estaba en el plan");
    const session = (await db.sessions.toArray())[0]!;
    await user.selectOptions(select, `s:${session.id}`);
    expect(await screen.findByText("✓ Glúteo: 1 de 2 registrados")).toBeTruthy();
    expect(await db.planEntries.count()).toBe(0);
    expect((await db.dayExtras.toArray())[0]).toMatchObject({ sessionId: session.id });
    const logs = (await db.weightLogs.toArray()).filter((l) => l.deletedAt === null);
    expect(logs.map((l) => l.exerciseId)).toEqual([puente]);

    // Con algo marcado no hay botón de quitar: se quita desmarcando.
    await vi.waitFor(() => expect(screen.queryByRole("button", { name: "Quitar" })).toBeNull());
    await user.click(await screen.findByRole("button", { name: "Hecho hoy. Desmarcar Puente" }));
    await vi.waitFor(async () =>
      expect((await db.dayExtras.toArray())[0]?.deletedAt).not.toBeNull(),
    );
    expect((await db.weightLogs.toArray()).every((l) => l.deletedAt !== null)).toBe(true);
    expect(await screen.findByText("✓ Puente quitado de hoy")).toBeTruthy();

    // «Deshacer» lo devuelve a Hoy con lo que estaba marcado.
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    // Lo último que hace «Deshacer» es volver a añadirlo a Hoy.
    await vi.waitFor(async () =>
      expect((await db.dayExtras.toArray()).some((e) => e.deletedAt === null)).toBe(true),
    );
    expect((await db.weightLogs.toArray()).some((l) => l.deletedAt === null)).toBe(true);
    // La sesión vuelve (cerrada) con 1 de 2 hechos.
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: /Glúteo/ }).textContent).toContain("1/2"),
    );
  });

  it("algo añadido sin nada marcado se puede quitar con «Quitar»", async () => {
    const { addExtra } = await import("@/db/repositories/dayExtras");
    const { localDateKey } = await import("@/lib/dates");
    const prensa = await exercise("Prensa");
    await addExtra(localDateKey(new Date()), { exerciseId: prensa });
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    await user.click(await screen.findByRole("button", { name: "Quitar" }));
    await vi.waitFor(async () =>
      expect((await db.dayExtras.toArray())[0]?.deletedAt).not.toBeNull(),
    );
  });

  it("un ejercicio con kilos se apunta igual que la última vez", async () => {
    const { addLog } = await import("@/db/repositories/weightLogs");
    const remo = await exercise("Remo");
    await addLog(remo, { date: "2026-01-05", kg: 25, sets: 3, reps: 12, note: null });
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter(router.routes, { initialEntries: ["/"] })} />,
    );
    await user.selectOptions(
      await screen.findByLabelText("Apuntar algo hecho hoy que no estaba en el plan"),
      `e:${remo}`,
    );
    expect(await screen.findByText("✓ Remo registrado")).toBeTruthy();
    const today = (await db.weightLogs.toArray()).filter((l) => l.date > "2026-01-05");
    expect(today[0]).toMatchObject({ kg: 25, sets: 3, reps: 12 });
  });
});

describe("corregir el progreso", () => {
  it("tocar un día muestra lo hecho; en una clase se añaden o quitan días", async () => {
    const { createExercise } = await import("@/db/repositories/exercises");
    const { addLog } = await import("@/db/repositories/weightLogs");
    const { localDateKey } = await import("@/lib/dates");
    const today = localDateKey(new Date());
    const pilates = await createExercise({
      name: "Pilates",
      type: "clase",
      physioNotes: "",
      sets: 1,
      reps: null,
      durationSec: 3600,
      targetKg: null,
    });
    await addLog(pilates, { date: today, kg: null, sets: 1, reps: null, note: null });
    const user = userEvent.setup();
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/progreso"] });
    render(<RouterProvider router={memory} />);

    await user.click(await screen.findByRole("link", { name: /Pilates/ }));
    const day = await screen.findByLabelText("Añadir un día");
    expect(screen.getByText("1 día")).toBeTruthy();
    await user.clear(day);
    await user.type(day, "2026-01-05");
    await user.click(screen.getByRole("button", { name: "Apuntar que fui" }));
    expect(await screen.findByText("2 días")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Apuntar que fui" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Ese día ya está apuntado.");

    await memory.navigate(`/progreso/dia/${today}`);
    expect(await screen.findByText("Clases y ejercicios")).toBeTruthy();
    expect(screen.getByText("Pilates", { ignore: "option, script, style" })).toBeTruthy();
  });

  it("desde una sesión se edita un ejercicio y se vuelve a la sesión", async () => {
    const { createSession } = await import("@/db/repositories/sessions");
    const id = await exercise("Prensa");
    const sessionId = await createSession({ name: "Glúteo", exerciseIds: [id] });
    const user = userEvent.setup();
    const memory = createMemoryRouter(router.routes, {
      initialEntries: [`/sesiones/${sessionId}`],
    });
    render(<RouterProvider router={memory} />);
    await user.click(await screen.findByRole("button", { name: "Editar Prensa" }));
    await vi.waitFor(
      () => expect(memory.state.location.pathname).toBe(`/ejercicios/${id}/editar`),
      { timeout: 5000 },
    );
    // Mientras carga, sigue visible la sesión (que también tiene «Nombre»): esperar el título.
    await screen.findByRole("heading", { name: "Editar ejercicio" });
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Prensa 45°");
    await user.click(screen.getByRole("button", { name: "Guardar ejercicio" }));
    await vi.waitFor(() => expect(memory.state.location.pathname).toBe(`/sesiones/${sessionId}`), {
      timeout: 5000,
    });
    expect((await db.exercises.get(id))?.name).toBe("Prensa 45°");
    expect(
      await screen.findByRole("button", { name: /Editar Prensa 45/ }, { timeout: 8000 }),
    ).toBeTruthy();
  });
});
