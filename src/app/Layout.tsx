import { NavLink, Outlet } from "react-router";
import { ListIcon, PlanIcon, SettingsIcon, TodayIcon } from "@/components/icons";
import { useAlerts } from "@/pwa/alerts";
import { UpdatePrompt } from "@/pwa/UpdatePrompt";

const TABS = [
  { to: "/", label: "Hoy", Icon: TodayIcon, end: true },
  { to: "/plan", label: "Plan", Icon: PlanIcon, end: false },
  { to: "/ejercicios", label: "Ejercicios", Icon: ListIcon, end: false },
  { to: "/ajustes", label: "Ajustes", Icon: SettingsIcon, end: false },
] as const;

export function Layout() {
  const { atRisk } = useAlerts();
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
                  `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                    isActive ? "text-accent" : "text-muted"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${
                        isActive ? "bg-accent-soft" : ""
                      }`}
                    >
                      <Icon className="size-6" />
                      {to === "/ajustes" && atRisk && (
                        <span className="absolute right-3 top-0.5 size-2.5 rounded-full bg-danger ring-2 ring-bg" />
                      )}
                    </span>
                    {label}
                    {to === "/ajustes" && atRisk && (
                      <span className="sr-only"> (hay un aviso)</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
