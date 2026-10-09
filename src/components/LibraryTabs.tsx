import { NavLink } from "react-router";

const LINKS = [
  { to: "/ejercicios", label: "Ejercicios" },
  { to: "/sesiones", label: "Sesiones" },
] as const;

/** Selector de la pestaña Ejercicios: ejercicios sueltos o sesiones (grupos de ejercicios). */
export function LibraryTabs() {
  return (
    <nav aria-label="Ejercicios o sesiones" className="mb-5">
      <ul className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {LINKS.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `flex min-h-11 items-center justify-center rounded-xl font-bold transition-colors ${
                  isActive ? "bg-surface text-text shadow-sm" : "text-muted"
                }`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
