import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

const { router } = await import("./router");

describe("navegación", () => {
  it("muestra Hoy y cambia de pestaña", async () => {
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/"] });
    render(<RouterProvider router={memory} />);
    expect(await screen.findByRole("heading", { name: /^Hoy/, level: 1 })).toBeTruthy();

    await userEvent.click(screen.getByRole("link", { name: "Ajustes" }));
    expect(await screen.findByRole("heading", { name: "Ajustes", level: 1 })).toBeTruthy();
    expect(screen.getByText(/La nube aún no está configurada/)).toBeTruthy();
  });

  it("las 4 pestañas existen y la activa se marca", async () => {
    const memory = createMemoryRouter(router.routes, { initialEntries: ["/plan"] });
    render(<RouterProvider router={memory} />);
    const nav = await screen.findByRole("navigation", { name: "Secciones" });
    expect(nav.querySelectorAll("a")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Plan" }).getAttribute("aria-current")).toBe("page");
  });
});
