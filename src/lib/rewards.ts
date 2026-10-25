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
  /** Días entrenados durante la temporada de magia de este año. */
  magiaDays: number;
  /** Récords conseguidos durante la temporada de magia de este año. */
  magiaRecords: number;
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
  /** Versión de cada temporada (emoji y nombre). */
  themed: Partial<Record<Exclude<Season, null>, [string, string]>>;
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
    themed: { halloween: ["🕯️", "La primera vela"], magia: ["🪄", "Primera varita"] },
    description: "Tu primer día entrenado.",
    hint: "Empieza por algo.",
    earned: (s) => s.trainedDays >= 1,
  },
  {
    id: "dias-5",
    emoji: "✋",
    title: "Cinco de cinco",
    themed: { halloween: ["🕷️", "Cinco patas de araña"], magia: ["📜", "Pergamino de aprendiz"] },
    description: "5 días entrenados.",
    hint: "Unos cuantos días más…",
    earned: (s) => s.trainedDays >= 5,
  },
  {
    id: "dias-10",
    emoji: "🔟",
    title: "Doble dígito",
    themed: { halloween: ["🦇", "Murciélago constante"], magia: ["🦉", "Lechuza fiel"] },
    description: "10 días entrenados.",
    hint: "Sigue sumando días.",
    earned: (s) => s.trainedDays >= 10,
  },
  {
    id: "dias-25",
    emoji: "🏗️",
    title: "Hábito en obras",
    themed: {
      halloween: ["🧟", "Imparable como un zombi"],
      magia: ["📚", "Biblioteca de hechizos"],
    },
    description: "25 días entrenados.",
    hint: "La constancia tiene premio.",
    earned: (s) => s.trainedDays >= 25,
  },
  {
    id: "dias-50",
    emoji: "🏛️",
    title: "Medio centenar",
    themed: { halloween: ["🏚️", "La casa encantada es tuya"], magia: ["🏰", "Castillo propio"] },
    description: "50 días entrenados.",
    hint: "Muchos, muchos días.",
    earned: (s) => s.trainedDays >= 50,
  },
  {
    id: "dias-100",
    emoji: "💯",
    title: "Cien días",
    themed: { halloween: ["🧛", "Inmortal"], magia: ["🧙", "Gran hechicería"] },
    description: "100 días entrenados.",
    hint: "Un número redondo y grande.",
    earned: (s) => s.trainedDays >= 100,
  },
  {
    id: "racha-2",
    emoji: "🔥",
    title: "¡En llamas!",
    themed: { halloween: ["🎃", "Calabaza encendida"], magia: ["✨", "Chispa mágica"] },
    description: "2 semanas seguidas cumpliendo el plan.",
    hint: "Cumple tu plan varias semanas seguidas.",
    earned: (s) => s.streak >= 2,
  },
  {
    id: "racha-4",
    emoji: "📅",
    title: "Un mes en racha",
    themed: { halloween: ["🌕", "Luna llena"], magia: ["🌙", "Luna de constancia"] },
    description: "4 semanas seguidas cumpliendo el plan.",
    hint: "Más semanas seguidas…",
    earned: (s) => s.streak >= 4,
  },
  {
    id: "racha-8",
    emoji: "⚡",
    title: "Imparable",
    themed: { halloween: ["⚰️", "Ni el ataúd te para"], magia: ["🐉", "Domadragones"] },
    description: "8 semanas seguidas cumpliendo el plan.",
    hint: "Una racha muy larga.",
    earned: (s) => s.streak >= 8,
  },
  {
    id: "record-1",
    emoji: "🏅",
    title: "Primer récord",
    themed: { halloween: ["💀", "Récord de ultratumba"], magia: ["🏆", "Copa de récords"] },
    description: "Levantaste más peso que nunca en un ejercicio.",
    hint: "Supera tu mejor peso.",
    earned: (s) => s.records >= 1,
  },
  {
    id: "record-5",
    emoji: "🥇",
    title: "Coleccionista de récords",
    themed: {
      halloween: ["🔮", "Bola de cristal: récords"],
      magia: ["💎", "Piedra de los récords"],
    },
    description: "Récord en 5 ejercicios distintos.",
    hint: "Récords en varios ejercicios.",
    earned: (s) => s.records >= 5,
  },
  {
    id: "subida-10",
    emoji: "📈",
    title: "Más fuerte",
    themed: { halloween: ["🧪", "Pócima de fuerza"], magia: ["🧪", "Poción vigorizante"] },
    description: "Subiste un 10 % de peso en un ejercicio.",
    hint: "Sube el peso poco a poco.",
    earned: (s) => s.bestGainPercent >= 10,
  },
  {
    id: "subida-25",
    emoji: "💪",
    title: "Músculo nuevo",
    themed: { halloween: ["🐺", "Fuerza de lobo"], magia: ["🦄", "Fuerza de unicornio"] },
    description: "Subiste un 25 % de peso en un ejercicio.",
    hint: "Bastante más peso que al principio.",
    earned: (s) => s.bestGainPercent >= 25,
  },
  {
    id: "subida-50",
    emoji: "🦾",
    title: "Brazo de hierro",
    themed: { halloween: ["🧟‍♂️", "Frankenstein"], magia: ["🔥", "Fénix renacido"] },
    description: "Subiste un 50 % de peso en un ejercicio.",
    hint: "Mucho, mucho más peso.",
    earned: (s) => s.bestGainPercent >= 50,
  },
  {
    id: "clases-10",
    emoji: "🧘",
    title: "Fiel a la clase",
    themed: { halloween: ["🧙", "Aquelarre"], magia: ["🧹", "Clase de vuelo"] },
    description: "10 clases hechas.",
    hint: "Ve a tus clases.",
    earned: (s) => s.classDays >= 10,
  },
  // Exclusivas de Halloween.
  {
    id: "halloween-noche",
    emoji: "🎃",
    title: "Truco o entreno",
    themed: { halloween: ["🎃", "Truco o entreno"] },
    description: "Entrenaste el 31 de octubre.",
    hint: "Solo en la noche más terrorífica…",
    earned: (s) => s.halloweenNights >= 1,
    season: "halloween",
  },
  {
    id: "halloween-semana",
    emoji: "👻",
    title: "Semana del terror",
    themed: { halloween: ["👻", "Semana del terror"] },
    description: "3 días entrenados en la temporada de Halloween.",
    hint: "Entrena varios días estas semanas de miedo.",
    earned: (s) => s.halloweenDays >= 3,
    season: "halloween",
  },
  // Exclusivas de la temporada de magia.
  {
    id: "magia-aprendiz",
    emoji: "🧙",
    title: "Aprendiz de magia",
    themed: {},
    description: "3 días entrenados en la temporada de magia.",
    hint: "Practica tus hechizos varios días estas semanas.",
    earned: (s) => s.magiaDays >= 3,
    season: "magia",
  },
  {
    id: "magia-lechuza",
    emoji: "🦉",
    title: "Lechuza mensajera",
    themed: {},
    description: "Un récord durante la temporada de magia.",
    hint: "Una lechuza trae noticias cuando superas tu mejor marca…",
    earned: (s) => s.magiaRecords >= 1,
    season: "magia",
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
    const [emoji, title] = (season && def.themed[season]) || [def.emoji, def.title];
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
