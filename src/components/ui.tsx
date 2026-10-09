/** Estilos base reutilizables. Todos los objetivos táctiles miden ≥ 48px (pensado para una mano). */
export const buttonPrimary =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-br from-accent to-accent-2 px-5 text-lg font-bold text-accent-contrast shadow-lg shadow-accent/25 transition-transform active:scale-[0.98] disabled:opacity-50";
export const buttonSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 font-semibold shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50";
export const inputClass =
  "block min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-text shadow-inner shadow-black/5 placeholder:text-muted";

export function PageHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <header className="mb-6">
      {eyebrow && (
        <p className="text-sm font-bold uppercase tracking-wider text-accent">{eyebrow}</p>
      )}
      <h1 className="text-4xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-lg text-muted">{subtitle}</p>}
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
    <section className={`rounded-3xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border p-6 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}
