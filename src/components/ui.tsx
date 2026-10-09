/** Estilos base reutilizables. Todos los objetivos táctiles miden ≥ 48px (pensado para una mano). */
export const buttonPrimary =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-lg font-semibold text-accent-contrast transition-transform active:scale-[0.98] disabled:opacity-50";
export const buttonSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 font-semibold transition-transform active:scale-[0.98] disabled:opacity-50";
export const inputClass =
  "block min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-text placeholder:text-muted";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </header>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}
