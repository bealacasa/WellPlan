import { useLiveQuery } from "dexie-react-hooks";
import type { Reward } from "@/lib/rewards";
import { db } from "../database";
import { getMeta, setMeta } from "../meta";

/** Ids de las recompensas ya abiertas en este dispositivo. */
export function useSeenRewards(): Set<string> | undefined {
  return useLiveQuery(async () => new Set((await getMeta<string[]>("seenRewards")) ?? []), []);
}

/** Recompensas conseguidas que aún no se han abierto (el regalo sorpresa). */
export const unopened = (rewards: readonly Reward[], seen: ReadonlySet<string>) =>
  rewards.filter((r) => r.earned && !seen.has(r.id));

/** Marca recompensas como abiertas. */
export async function markRewardsSeen(ids: readonly string[]): Promise<void> {
  await db.transaction("rw", db.meta, async () => {
    const seen = new Set((await getMeta<string[]>("seenRewards")) ?? []);
    for (const id of ids) seen.add(id);
    await setMeta("seenRewards", [...seen]);
  });
}
