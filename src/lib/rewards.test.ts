import { describe, expect, it } from "vitest";
import { computeRewards, type RewardStats } from "./rewards";
import { isHalloweenNight, seasonOn } from "./season";

const none: RewardStats = {
  trainedDays: 0,
  streak: 0,
  records: 0,
  bestGainPercent: 0,
  classDays: 0,
  halloweenNights: 0,
  halloweenDays: 0,
};

describe("temporada de Halloween", () => {
  it("dura 15 días: del 25 de octubre al 8 de noviembre", () => {
    expect(seasonOn(new Date(2026, 9, 24, 12))).toBeNull();
    expect(seasonOn(new Date(2026, 9, 25, 12))).toBe("halloween");
    expect(seasonOn(new Date(2026, 10, 8, 12))).toBe("halloween");
    expect(seasonOn(new Date(2026, 10, 9, 12))).toBeNull();
    expect(isHalloweenNight(new Date(2026, 9, 31, 20))).toBe(true);
  });
});

describe("recompensas", () => {
  it("se desbloquean por días, rachas, récords, subidas y clases", () => {
    const rewards = computeRewards(
      { ...none, trainedDays: 12, streak: 2, records: 1, bestGainPercent: 30, classDays: 3 },
      null,
    );
    const earned = rewards.filter((r) => r.earned).map((r) => r.id);
    expect(earned).toEqual([
      "dias-1",
      "dias-5",
      "dias-10",
      "racha-2",
      "record-1",
      "subida-10",
      "subida-25",
    ]);
    // Fuera de temporada no aparecen las exclusivas de Halloween que no se tienen.
    expect(rewards.some((r) => r.seasonal)).toBe(false);
    expect(rewards.find((r) => r.id === "dias-1")?.title).toBe("Primer paso");
  });

  it("en Halloween cambian de nombre y aparecen las exclusivas", () => {
    const rewards = computeRewards({ ...none, trainedDays: 1, halloweenNights: 1 }, "halloween");
    expect(rewards.find((r) => r.id === "dias-1")).toMatchObject({
      emoji: "🕯️",
      title: "La primera vela",
    });
    expect(rewards.find((r) => r.id === "halloween-noche")).toMatchObject({
      earned: true,
      seasonal: true,
    });
    expect(rewards.find((r) => r.id === "halloween-semana")?.earned).toBe(false);
    // Lo conseguido en temporada se conserva después.
    expect(
      computeRewards({ ...none, halloweenNights: 1 }, null).some(
        (r) => r.id === "halloween-noche" && r.earned,
      ),
    ).toBe(true);
  });
});
