import { KG_STEP, formatKg, parseKg, stepKg } from "@/lib/numbers";

/**
 * Campo de kilos: teclado decimal (acepta "22,5") y botones ±2,5 kg grandes.
 * Trabaja con texto para no pelearse con la coma mientras se escribe.
 */
export function KgField({
  id,
  label,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const current = parseKg(value) ?? 0;
  const step = (delta: number) => onChange(formatKg(stepKg(current, delta)));
  const button =
    "min-h-14 shrink-0 rounded-xl bg-surface-2 px-3 text-lg font-bold tabular-nums active:scale-95";

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => step(-KG_STEP)}
          className={button}
          aria-label={`Restar ${formatKg(KG_STEP)} kilos`}
        >
          −{formatKg(KG_STEP)}
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={invalid || undefined}
            className="min-h-14 w-full rounded-xl border border-border bg-surface pr-10 text-center text-2xl font-bold tabular-nums aria-invalid:border-danger"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-muted">
            kg
          </span>
        </div>
        <button
          type="button"
          onClick={() => step(KG_STEP)}
          className={button}
          aria-label={`Sumar ${formatKg(KG_STEP)} kilos`}
        >
          +{formatKg(KG_STEP)}
        </button>
      </div>
    </div>
  );
}
