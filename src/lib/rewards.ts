import type { Season } from "./season";

/*
 * Recompensas sorpresa. Se calculan siempre a partir de los registros (no se guardan): si
 * borras registros, una recompensa puede volver a bloquearse. Lo único que se guarda (en el
 * dispositivo) es cuáles ya has abierto, para enseñar el regalo solo con las nuevas.
 */

export type RewardStats = {
  /** Días distintos con algún registro, en total. */
  trainedDays: number;
  /** Semanas seguidas cumpliendo el plan. */
  streak: number;
  /** Ejercicios con récord (mejor peso que superó uno anterior). */
  records: number;
  /** Mayor subida de peso (%) en algún ejercicio, de hace 3 meses a ahora. */
  bestGainPercent: number;
  /** Días distintos con alguna clase hecha, en total. */
  classDays: number;
  /** Días entrenados el 31 de octubre (cualquier año). */
  halloweenNights: number;
  /** Días entrenados durante la temporada de Halloween de este año. */
  halloweenDays: number;
};

export type Reward = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Pista mientras está bloqueada (sin desvelar la sorpresa). */
  hint: string;
  earned: boolean;
  /** Solo existe en una temporada (se oculta fuera de ella si no se ha conseguido). */
  seasonal?: boolean;
};

type Def = {
  id: string;
  emoji: string;
  title: string;
  /** Versión de Halloween (emoji y nombre). */
  spooky: [string, string];
  description: string;
  hint: string;
  earned: (s: RewardStats) => boolean;
  season?: Season;
};

const DEFS: Def[] = [
  {
    id: "dias-1",
    emoji: "🌱",
    title: "Primer paso",
    spooky: ["🕯️", "La primera vela"],
    description: "Tu primer día entrenado.",
    hint: "Empieza por algo.",
    earned: (s) => s.trainedDays >= 1,
  },
  {
    id: "dias-5",
    emoji: "✋",
    title: "Cinco de cinco",
    spooky: ["🕷️", "Cinco patas de araña"],
    description: "5 días entrenados.",
    hint: "Unos cuantos días más…",
    earned: (s) => s.trainedDays >= 5,
  },
  {
    id: "dias-10",
    emoji: "🔟",
    title: "Doble dígito",
    spooky: ["🦇", "Murciélago constante"],
    description: "10 días entrenados.",
    hint: "Sigue sumando días.",
    earned: (s) => s.trainedDays >= 10,
  },
  {
    id: "dias-25",
    emoji: "🏗️",
    title: "Hábito en obras",
    spooky: ["🧟", "Imparable como un zombi"],
    description: "25 días entrenados.",
    hint: "La constancia tiene premio.",
    earned: (s) => s.trainedDays >= 25,
  },
  {
    id: "dias-50",
    emoji: "🏛️",
    title: "Medio centenar",
    spooky: ["🏚️", "La casa encantada es tuya"],
    description: "50 días entrenados.",
    hint: "Muchos, muchos días.",
    earned: (s) => s.trainedDays >= 50,
  },
  {
    id: "dias-100",
    emoji: "💯",
    title: "Cien días",
    spooky: ["🧛", "Inmortal"],
    description: "100 días entrenados.",
    hint: "Un número redondo y grande.",
    earned: (s) => s.trainedDays >= 100,
  },
  {
    id: "racha-2",
    emoji: "🔥",
    title: "¡En llamas!",
    spooky: ["🎃", "Calabaza encendida"],
    description: "2 semanas seguidas cumpliendo el plan.",
    hint: "Cumple tu plan varias semanas seguidas.",
    earned: (s) => s.streak >= 2,
  },
  {
    id: "racha-4",
    emoji: "📅",
    title: "Un mes en racha",
    spooky: ["🌕", "Luna llena"],
    description: "4 semanas seguidas cumpliendo el plan.",
    hint: "Más semanas seguidas…",
    earned: (s) => s.streak >= 4,
  },
  {
    id: "racha-8",
    emoji: "⚡",
    title: "Imparable",
    spooky: ["⚰️", "Ni el ataúd te para"],
    description: "8 semanas seguidas cumpliendo el plan.",
    hint: "Una racha muy larga.",
    earned: (s) => s.streak >= 8,
  },
  {
    id: "record-1",
    emoji: "🏅",
    title: "Primer récord",
    spooky: ["💀", "Récord de ultratumba"],
    description: "Levantaste más peso que nunca en un ejercicio.",
    hint: "Supera tu mejor peso.",
    earned: (s) => s.records >= 1,
  },
  {
    id: "record-5",
    emoji: "🥇",
    title: "Coleccionista de récords",
    spooky: ["🔮", "Bola de cristal: récords"],
    description: "Récord en 5 ejercicios distintos.",
    hint: "Récords en varios ejercicios.",
    earned: (s) => s.records >= 5,
  },
  {
    id: "subida-10",
    emoji: "📈",
    title: "Más fuerte",
    spooky: ["🧪", "Pócima de fuerza"],
    description: "Subiste un 10 % de peso en un ejercicio.",
    hint: "Sube el peso poco a poco.",
    earned: (s) => s.bestGainPercent >= 10,
  },
  {
    id: "subida-25",
    emoji: "💪",
    title: "Músculo nuevo",
    spooky: ["🐺", "Fuerza de lobo"],
    description: "Subiste un 25 % de peso en un ejercicio.",
    hint: "Bastante más peso que al principio.",
    earned: (s) => s.bestGainPercent >= 25,
  },
  {
    id: "subida-50",
    emoji: "🦾",
    title: "Brazo de hierro",
    spooky: ["🧟‍♂️", "Frankenstein"],
    description: "Subiste un 50 % de peso en un ejercicio.",
    hint: "Mucho, mucho más peso.",
    earned: (s) => s.bestGainPercent >= 50,
  },
  {
    id: "clases-10",
    emoji: "🧘",
    title: "Fiel a la clase",
    spooky: ["🧙", "Aquelarre"],
    description: "10 clases hechas.",
    hint: "Ve a tus clases.",
    earned: (s) => s.classDays >= 10,
  },
  // Exclusivas de Halloween.
  {
    id: "halloween-noche",
    emoji: "🎃",
    title: "Truco o entreno",
    spooky: ["🎃", "Truco o entreno"],
    description: "Entrenaste el 31 de octubre.",
    hint: "Solo en la noche más terrorífica…",
    earned: (s) => s.halloweenNights >= 1,
    season: "halloween",
  },
  {
    id: "halloween-semana",
    emoji: "👻",
    title: "Semana del terror",
    spooky: ["👻", "Semana del terror"],
    description: "3 días entrenados en la temporada de Halloween.",
    hint: "Entrena varios días estas semanas de miedo.",
    earned: (s) => s.halloweenDays >= 3,
    season: "halloween",
  },
];

/**
 * Todas las recompensas con su estado. En temporada, con nombre y emoji de la temporada; las
 * exclusivas de una temporada solo aparecen en ella (o si ya se consiguieron).
 */
export function computeRewards(stats: RewardStats, season: Season): Reward[] {
  return DEFS.flatMap((def): Reward[] => {
    const earned = def.earned(stats);
    if (def.season && def.season !== season && !earned) return [];
    const [emoji, title] = season === "halloween" ? def.spooky : [def.emoji, def.title];
    return [
      {
        id: def.id,
        emoji,
        title,
        description: def.description,
        hint: def.hint,
        earned,
        ...(def.season ? { seasonal: true } : {}),
      },
    ];
  });
}
