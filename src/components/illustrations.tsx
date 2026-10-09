/*
 * Ilustraciones de ejercicios (figuras de palo, SVG en línea, sin dependencias ni red).
 * Se muestran cuando un ejercicio no tiene foto y su nombre coincide con uno conocido.
 */

type Props = { className?: string };

function Figure({ className = "size-12", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const Floor = ({ y = 42 }: { y?: number }) => (
  <path d={`M4 ${y}h40`} strokeWidth={2} opacity={0.5} />
);

/** Sentadilla: cadera atrás, muslos paralelos, brazos al frente. */
const Squat = (p: Props) => (
  <Figure {...p}>
    <circle cx="23" cy="8" r="3.5" />
    <path d="M22 12l-5 13M17 25h13l-2 15M21 15l13 3M26 40h7" />
    <Floor />
  </Figure>
);

/** Peso muerto: bisagra de cadera con la barra junto a las piernas. */
const Deadlift = (p: Props) => (
  <Figure {...p}>
    <circle cx="11" cy="19" r="3.5" />
    <path d="M15 21l15-1M30 20l1 10-1 11M17 22v13M6 35h24" />
    <path d="M8 31v8M28 31v8" strokeWidth={4} />
    <Floor />
  </Figure>
);

/** Hip thrust: espalda en el banco, cadera arriba con la barra encima. */
const HipThrust = (p: Props) => (
  <Figure {...p}>
    <circle cx="6" cy="21" r="3.5" />
    <path d="M10 24l14-3 9 3v14M33 38h6" />
    <circle cx="24" cy="16" r="3.5" strokeWidth={2.5} />
    <path d="M3 28h12M5 28v10M13 28v10" strokeWidth={2.5} />
    <Floor />
  </Figure>
);

/** Prensa de piernas: sentado reclinado empujando la plataforma. */
const LegPress = (p: Props) => (
  <Figure {...p}>
    <circle cx="9" cy="14" r="3.5" />
    <path d="M11 18l5 13M16 31l10-9 9 3" />
    <path d="M38 14l3 20" strokeWidth={4} />
    <path d="M6 35l18-1M10 35v6M20 34v7" strokeWidth={2.5} />
  </Figure>
);

/** Patada trasera: en cuadrupedia, una pierna empuja hacia atrás y arriba. */
const DonkeyKick = (p: Props) => (
  <Figure {...p}>
    <circle cx="8" cy="19" r="3.5" />
    <path d="M12 22h15M13 22v14M27 22v14h8M27 22h10V11" />
    <Floor y={37} />
  </Figure>
);

/** Plancha frontal: apoyo en antebrazos, cuerpo recto. */
const Plank = (p: Props) => (
  <Figure {...p}>
    <circle cx="8" cy="22" r="3.5" />
    <path d="M12 25l28 8M12 25v8h7" />
    <Floor y={35} />
  </Figure>
);

/** Plancha lateral: apoyo en un antebrazo, brazo libre hacia arriba. */
const SidePlank = (p: Props) => (
  <Figure {...p}>
    <circle cx="10" cy="15" r="3.5" />
    <path d="M13 21l27 15M13 21v13h6M13 21V8" />
    <Floor y={37} />
  </Figure>
);

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const FIGURES = {
  side_plank: SidePlank,
  plank: Plank,
  squat: Squat,
  deadlift: Deadlift,
  hip_thrust: HipThrust,
  leg_press: LegPress,
  donkey_kick: DonkeyKick,
} as const;

export type IllustrationKey = keyof typeof FIGURES;

// El orden importa: lo más específico primero ("plancha lateral" antes que "plancha").
const MATCHERS: [RegExp, IllustrationKey][] = [
  [/plancha lateral|side plank/, "side_plank"],
  [/plancha|plank/, "plank"],
  [/sentadilla|squat/, "squat"],
  [/peso muerto|deadlift/, "deadlift"],
  [/hip ?th?rust|puente de gluteo|glute bridge/, "hip_thrust"],
  [/prensa|leg press/, "leg_press"],
  [/patada|kickback|donkey/, "donkey_kick"],
];

/** Clave de la ilustración para un nombre de ejercicio, o null si no hay ninguna. */
export function illustrationFor(name: string): IllustrationKey | null {
  const key = normalize(name);
  return MATCHERS.find(([pattern]) => pattern.test(key))?.[1] ?? null;
}

/** Dibuja la ilustración indicada. */
export function ExerciseIllustration({ kind, className }: { kind: IllustrationKey } & Props) {
  const Drawing = FIGURES[kind];
  return <Drawing className={className} />;
}
