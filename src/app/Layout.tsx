import { NavLink, Outlet } from "react-router";
import { ListIcon, PlanIcon, SettingsIcon, TodayIcon } from "@/components/icons";
import { UpdatePrompt } from "@/pwa/UpdatePrompt";

const TABS = [
  { to: "/", label: "Hoy", Icon: TodayIcon, end: true },
  { to: "/plan", label: "Plan", Icon: PlanIcon, end: false },
  { to: "/ejercicios", label: "Ejercicios", Icon: ListIcon, end: false },
  { to: "/ajustes", label: "Ajustes", Icon: SettingsIcon, end: false },
] as const;

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="contenido"
        className="mx-auto w-full max-w-xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]"
      >
        <Outlet />
      </main>
      <UpdatePrompt />
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <ul className="mx-auto flex max-w-xl">
          {TABS.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                    isActive ? "text-accent" : "text-muted"
                  }`
                }
              >
                <Icon className="size-7" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
