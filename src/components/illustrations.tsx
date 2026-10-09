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

/** Spinning: en la bici estática, inclinada hacia el manillar. */
const Spinning = (p: Props) => (
  <Figure {...p}>
    <circle cx="20" cy="9" r="3.5" />
    <path d="M22 13l10 11M23 15l-8 5M32 24l-6 7 2 6" />
    <circle cx="11" cy="33" r="5" strokeWidth={2.5} />
    <path d="M15 20l-2 7M11 33l17 4M29 25h6M32 25l-3 12M6 42h32" strokeWidth={2.5} />
  </Figure>
);

/** Body Pump: barra con discos sobre los hombros. */
const BodyPump = (p: Props) => (
  <Figure {...p}>
    <circle cx="24" cy="9" r="3.5" />
    <path d="M5 15h38" strokeWidth={2.5} />
    <path d="M8 10v10M40 10v10" strokeWidth={4} />
    <path d="M24 13v15M24 18l-6-3M24 18l6-3M24 28l-6 7v6M24 28l6 7v6" />
    <Floor />
  </Figure>
);

/** GAP (glúteos, abdominales y piernas): zancada. */
const Lunge = (p: Props) => (
  <Figure {...p}>
    <circle cx="22" cy="8" r="3.5" />
    <path d="M22 12v14M22 16l-5 5 5 3M22 26l10 2v13M22 26l-6 10-8 4" />
    <Floor />
  </Figure>
);

/** Pilates: el "teaser", sentada en V con los brazos hacia los pies. */
const Pilates = (p: Props) => (
  <Figure {...p}>
    <circle cx="11" cy="13" r="3.5" />
    <path d="M14 18l10 17 14-17M15 21l14-6" />
    <Floor y={38} />
  </Figure>
);

/** Yoga: postura del árbol, manos unidas sobre la cabeza. */
const Yoga = (p: Props) => (
  <Figure {...p}>
    <circle cx="24" cy="10" r="3.5" />
    <path d="M24 14v14M24 18l-6-8 6-6 6 6-6 8M24 28v14M24 28l8 6-8 3" />
    <Floor y={43} />
  </Figure>
);

/** Zumba o baile: un brazo arriba y una pierna en movimiento. */
const Dance = (p: Props) => (
  <Figure {...p}>
    <circle cx="21" cy="8" r="3.5" />
    <path d="M22 12l2 14M23 16l-9-8M23 16l11 4M24 26l-5 15M24 26l9 7 6-3" />
    <Floor />
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
  spinning: Spinning,
  body_pump: BodyPump,
  lunge: Lunge,
  pilates: Pilates,
  yoga: Yoga,
  dance: Dance,
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
  // Clases del gimnasio.
  [/spinning|ciclo|bici|cycling/, "spinning"],
  [/body ?pump|pump/, "body_pump"],
  [/\bgap\b|zancada|lunge/, "lunge"],
  [/pilates/, "pilates"],
  [/yoga/, "yoga"],
  [/zumba|baile|dance|bachata|salsa/, "dance"],
];

/** Clave de la ilustración para un nombre de ejercicio, o null si no hay ninguna. */
export function illustrationFor(name: string): IllustrationKey | null {
  const key = normalize(name);
  return MATCHERS.find(([pattern]) => pattern.test(key))?.[1] ?? null;
}

// Sesiones: palabras habituales en sus nombres ("Glúteo", "Pierna + core"…).
const SESSION_MATCHERS: [RegExp, IllustrationKey][] = [
  [/glute|gluteo/, "hip_thrust"],
  [/pierna|leg/, "squat"],
  [/core|abdom|abs\b/, "plank"],
  [/espalda|back/, "deadlift"],
  [/brazo|hombro|pecho|superior|upper|arm/, "body_pump"],
  [/estira|movilidad|stretch|flexib/, "yoga"],
];

/**
 * Ilustración de una sesión sin foto: por su nombre o, si no dice nada, la del primer
 * ejercicio de la sesión que tenga una.
 */
export function sessionIllustrationFor(
  name: string,
  exerciseNames: readonly string[],
): IllustrationKey | null {
  const key = normalize(name);
  return (
    illustrationFor(name) ??
    SESSION_MATCHERS.find(([pattern]) => pattern.test(key))?.[1] ??
    exerciseNames.map(illustrationFor).find((k) => k !== null) ??
    null
  );
}

/** Dibuja la ilustración indicada. */
export function ExerciseIllustration({ kind, className }: { kind: IllustrationKey } & Props) {
  const Drawing = FIGURES[kind];
  return <Drawing className={className} />;
}
