import type { ExerciseType } from "@/db/types";

type IconProps = { className?: string };

function Svg({ className = "size-6", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Máquina: pila de discos con guía. */
const MachineIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2v6M7 8h10v4H7zM7 14h10v4H7zM5 22h14" />
  </Svg>
);
const DumbbellIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />
  </Svg>
);
const BodyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M5 9l7 1.5L19 9M12 10.5V15l-3 6M12 15l3 6" />
  </Svg>
);
const StretchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="16" cy="4.5" r="2" />
    <path d="M4 20l5-6 4 1 3-6M13 15l2 5M4 8l6 2" />
  </Svg>
);
const ClassIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="6" r="2.2" />
    <circle cx="16" cy="6" r="2.2" />
    <path d="M3.5 19c.6-3.5 2.4-5.5 4.5-5.5S11.9 15.5 12.5 19M11.5 19c.6-3.5 2.4-5.5 4.5-5.5s3.9 2 4.5 5.5" />
  </Svg>
);

const RunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="15" cy="4" r="2" />
    <path d="M7 21l3-6 3 2v5M10 15l1-5 4 2 3 1M11 10L8 9l-3 3M4 21h3" />
  </Svg>
);

/**
 * Color e icono de cada tipo de ejercicio (contraste AA en claro y oscuro). Sirve para
 * reconocer de un vistazo qué toca, también cuando el ejercicio no tiene foto.
 */
export const TYPE_STYLE: Record<
  ExerciseType,
  { Icon: (p: IconProps) => React.ReactElement; tile: string; chip: string }
> = {
  maquina: {
    Icon: MachineIcon,
    tile: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    chip: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  },
  peso_libre: {
    Icon: DumbbellIcon,
    tile: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    chip: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  },
  peso_corporal: {
    Icon: BodyIcon,
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    chip: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  },
  estiramiento: {
    Icon: StretchIcon,
    tile: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
    chip: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200",
  },
  cardio: {
    Icon: RunIcon,
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  },
  clase: {
    Icon: ClassIcon,
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
};

/** Etiqueta de tipo con su color e icono. */
export function TypeChip({ type, label }: { type: ExerciseType; label: string }) {
  const { Icon, chip } = TYPE_STYLE[type];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${chip}`}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
