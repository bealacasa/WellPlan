import { useState } from "react";
import { NumberStepper } from "@/components/NumberStepper";
import { inputClass } from "@/components/ui";
import { formatKg, parseKm } from "@/lib/numbers";

/** Objetivo de cardio: distancia, tiempo e intervalos CaCo (todo opcional; null = sin objetivo). */
export type CardioTarget = {
  targetDistanceKm: number | null;
  durationSec: number | null;
  intervalRunSec: number | null;
  intervalWalkSec: number | null;
  intervalRounds: number | null;
};

export const NO_CARDIO_TARGET: CardioTarget = {
  targetDistanceKm: null,
  durationSec: null,
  intervalRunSec: null,
  intervalWalkSec: null,
  intervalRounds: null,
};

type Read = { ok: true; value: CardioTarget } | { ok: false; error: string };

/**
 * Campos del objetivo de cardio (se usan al editar el ejercicio y al ponerle un objetivo
 * distinto un día concreto del plan). Devuelve los campos y `read()` para validarlos.
 */
export function useCardioTarget(initial: CardioTarget, idPrefix = "cardio") {
  const [km, setKm] = useState(
    initial.targetDistanceKm != null ? formatKg(initial.targetDistanceKm) : "",
  );
  const [minutes, setMinutes] = useState(
    initial.durationSec ? String(Math.round(initial.durationSec / 60)) : "",
  );
  const [useIntervals, setUseIntervals] = useState(initial.intervalRounds != null);
  const [runMin, setRunMin] = useState(Math.round((initial.intervalRunSec ?? 120) / 60));
  const [walkMin, setWalkMin] = useState(Math.round((initial.intervalWalkSec ?? 60) / 60));
  const [rounds, setRounds] = useState(initial.intervalRounds ?? 8);

  function read(): Read {
    const distance = km.trim() === "" ? null : parseKm(km);
    if (km.trim() !== "" && distance === null) {
      return { ok: false, error: "La distancia debe ser un número de km (por ejemplo 5,5)." };
    }
    const mins = minutes.trim() === "" ? null : Number(minutes);
    if (mins !== null && !(Number.isInteger(mins) && mins >= 1 && mins <= 180)) {
      return { ok: false, error: "El tiempo objetivo debe estar entre 1 y 180 minutos." };
    }
    return {
      ok: true,
      value: {
        targetDistanceKm: distance,
        durationSec: mins !== null ? mins * 60 : null,
        intervalRunSec: useIntervals ? runMin * 60 : null,
        intervalWalkSec: useIntervals ? walkMin * 60 : null,
        intervalRounds: useIntervals ? rounds : null,
      },
    };
  }

  const fields = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-km`} className="text-sm font-medium">
            Distancia (km)
          </label>
          <input
            id={`${idPrefix}-km`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Ej.: 5"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className={`${inputClass} mt-1 text-center text-lg font-bold`}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-min`} className="text-sm font-medium">
            Tiempo (min)
          </label>
          <input
            id={`${idPrefix}-min`}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="Ej.: 30"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))}
            className={`${inputClass} mt-1 text-center text-lg font-bold`}
          />
        </div>
      </div>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 px-4 font-semibold">
        <input
          type="checkbox"
          checked={useIntervals}
          onChange={(e) => setUseIntervals(e.target.checked)}
          className="size-6 accent-[var(--accent)]"
        />
        Intervalos CaCo (caminar-correr)
      </label>
      {useIntervals && (
        <div className="grid gap-3">
          <NumberStepper
            id={`${idPrefix}-run`}
            label="Correr (min)"
            value={runMin}
            onChange={setRunMin}
            min={1}
            max={60}
          />
          <NumberStepper
            id={`${idPrefix}-walk`}
            label="Andar (min)"
            value={walkMin}
            onChange={setWalkMin}
            min={0}
            max={60}
          />
          <NumberStepper
            id={`${idPrefix}-rounds`}
            label="Repeticiones"
            value={rounds}
            onChange={setRounds}
            min={1}
            max={100}
          />
        </div>
      )}
    </>
  );

  return { fields, read };
}
