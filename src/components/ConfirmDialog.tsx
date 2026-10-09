import { useCallback, useRef, useState } from "react";

type Options = { title: string; message: string; confirmLabel: string };

/**
 * Confirmación antes de acciones destructivas. Usa el <dialog> nativo (accesible con
 * VoiceOver, se cierra con Escape) con botones grandes.
 *
 *   const [dialog, confirm] = useConfirm();
 *   if (await confirm({ ... })) borrar();
 */
export function useConfirm(): [React.ReactNode, (options: Options) => Promise<boolean>] {
  const ref = useRef<HTMLDialogElement>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);
  const [options, setOptions] = useState<Options | null>(null);

  const close = (value: boolean) => {
    ref.current?.close();
    resolver.current?.(value);
    resolver.current = undefined;
  };

  const confirm = useCallback((next: Options) => {
    setOptions(next);
    // Esperamos al render para abrir el diálogo ya con el texto nuevo.
    queueMicrotask(() => ref.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const dialog = (
    <dialog
      ref={ref}
      onCancel={() => close(false)}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl border border-border bg-surface p-6 text-text backdrop:bg-black/50"
    >
      <h2 id="confirm-title" className="text-xl font-bold">
        {options?.title}
      </h2>
      <p className="mt-2 text-muted">{options?.message}</p>
      <div className="mt-6 grid gap-2">
        <button
          type="button"
          onClick={() => close(true)}
          className="min-h-14 rounded-2xl bg-danger px-5 text-lg font-semibold text-white"
        >
          {options?.confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => close(false)}
          className="min-h-14 rounded-2xl border border-border px-5 text-lg font-semibold"
        >
          Cancelar
        </button>
      </div>
    </dialog>
  );

  return [dialog, confirm];
}
