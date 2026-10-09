import { clampInt } from "@/lib/numbers";

/** Entero con botones − / + grandes: se usa con una mano y sin abrir el teclado. */
export function NumberStepper({
  id,
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  const button =
    "grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl font-bold active:scale-95 disabled:opacity-40";
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Restar uno a ${label.toLowerCase()}`}
          onClick={() => onChange(clampInt(value - 1, min, max))}
          disabled={value <= min}
          className={button}
        >
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/\D/g, ""));
            if (Number.isFinite(n)) onChange(clampInt(n, min, max));
          }}
          className="min-h-12 w-full min-w-0 rounded-xl border border-border bg-surface text-center text-xl font-semibold tabular-nums"
        />
        <button
          type="button"
          aria-label={`Sumar uno a ${label.toLowerCase()}`}
          onClick={() => onChange(clampInt(value + 1, min, max))}
          disabled={value >= max}
          className={button}
        >
          +
        </button>
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
