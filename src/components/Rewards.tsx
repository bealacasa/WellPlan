import { useState } from "react";
import { Card, buttonPrimary } from "@/components/ui";
import { markRewardsSeen, unopened, useSeenRewards } from "@/db/repositories/rewards";
import type { Reward } from "@/lib/rewards";
import { SEASON_DECOR, type Season } from "@/lib/season";

/**
 * Regalo sorpresa en Hoy: si has conseguido recompensas nuevas, una caja que se abre al
 * tocarla y enseña cuáles son. Al cerrarla quedan como abiertas (en este dispositivo).
 */
export function RewardGift({ rewards, season }: { rewards: Reward[]; season: Season }) {
  const seen = useSeenRewards();
  const [opened, setOpened] = useState<Reward[] | null>(null);
  if (!seen) return null;
  const fresh = unopened(rewards, seen);
  const box = season ? SEASON_DECOR[season].gift : "🎁";

  if (opened) {
    return (
      <Card className="mt-4 border-2 border-accent text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-accent">
          {opened.length === 1 ? "¡Recompensa desbloqueada!" : "¡Recompensas desbloqueadas!"}
        </p>
        <ul className="mt-3 space-y-3" aria-live="polite">
          {opened.map((r) => (
            <li key={r.id} className="rounded-2xl bg-accent-soft p-4">
              <span aria-hidden="true" className="block text-5xl motion-safe:animate-bounce">
                {r.emoji}
              </span>
              <span className="mt-2 block text-xl font-extrabold">{r.title}</span>
              <span className="block text-muted">{r.description}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setOpened(null)} className={`${buttonPrimary} mt-4`}>
          ¡Genial!
        </button>
      </Card>
    );
  }

  if (fresh.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => {
        setOpened(fresh);
        void markRewardsSeen(fresh.map((r) => r.id));
      }}
      className="mt-4 flex w-full items-center gap-4 rounded-3xl border-2 border-dashed border-accent bg-accent-soft p-4 text-left active:scale-[0.99]"
    >
      <span aria-hidden="true" className="text-5xl motion-safe:animate-bounce">
        {box}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold">
          {fresh.length === 1
            ? "¡Tienes una recompensa sorpresa!"
            : `¡Tienes ${fresh.length} recompensas sorpresa!`}
        </span>
        <span className="block text-muted">Toca para abrir</span>
      </span>
    </button>
  );
}

/** Todas las recompensas en Progreso: las conseguidas, y las demás como sorpresa con pista. */
export function RewardsCard({ rewards }: { rewards: Reward[] }) {
  const earned = rewards.filter((r) => r.earned).length;
  // Primero las conseguidas; las sorpresas, al final.
  const sorted = [...rewards].sort((a, b) => Number(b.earned) - Number(a.earned));
  return (
    <Card>
      <h2 className="text-lg font-bold">Recompensas</h2>
      <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
        {earned} de {rewards.length}
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {sorted.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl p-3 ${r.earned ? "bg-accent-soft" : "bg-surface-2"}`}
          >
            <span aria-hidden="true" className={`block text-3xl ${r.earned ? "" : "grayscale"}`}>
              {r.earned ? r.emoji : "❓"}
            </span>
            <span className="mt-1 block font-bold leading-tight">
              {r.earned ? r.title : "Sorpresa"}
              {r.seasonal && <span className="sr-only"> (de temporada)</span>}
            </span>
            <span className="block text-sm text-muted">{r.earned ? r.description : r.hint}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
