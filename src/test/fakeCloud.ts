import type { SyncClient } from "@/sync/engine";

type Row = Record<string, unknown>;
type Result = { data: Row[]; error: null };

/**
 * Nube falsa en memoria: imita las partes de supabase-js que usa el motor de sync
 * (upsert, select con gte/in/order/limit, rpc set_session_exercises y Storage).
 */
export function fakeCloud() {
  const tables: Record<string, Map<string, Row>> = {};
  const sessionExercises: Row[] = [];
  const files = new Map<string, Blob>();
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 9, 9) + ++tick * 1000).toISOString();
  const tableOf = (name: string) => (tables[name] ??= new Map());

  function query(rows: () => Row[]) {
    const filters: ((r: Row) => boolean)[] = [];
    let sortBy: string | null = null;
    let max = Infinity;
    const run = (): Result => {
      const data = rows().filter((r) => filters.every((f) => f(r)));
      if (sortBy) {
        const key = sortBy;
        data.sort((a, b) => String(a[key]).localeCompare(String(b[key]), "en", { numeric: true }));
      }
      return { data: data.slice(0, max), error: null };
    };
    const builder = {
      gte(column: string, value: string) {
        filters.push((r) => String(r[column]) >= value);
        return builder;
      },
      in(column: string, values: unknown[]) {
        filters.push((r) => values.includes(r[column]));
        return builder;
      },
      order(column: string) {
        sortBy = column;
        return builder;
      },
      limit(n: number) {
        max = n;
        return Promise.resolve(run());
      },
      // Como en supabase-js, la consulta se puede esperar directamente.
      then<T>(resolve: (value: Result) => T) {
        return Promise.resolve(run()).then(resolve);
      },
    };
    return builder;
  }

  const client = {
    from(name: string) {
      if (name === "session_exercises") {
        return { select: () => query(() => sessionExercises) };
      }
      const table = tableOf(name);
      return {
        upsert: async (rows: Row[]) => {
          for (const row of rows) {
            const id = String(row.id);
            table.set(id, { ...table.get(id), ...row, server_updated_at: now() });
          }
          return { error: null };
        },
        select: () => query(() => [...table.values()]),
      };
    },
    async rpc(fn: string, args: { p_session_id: string; p_exercise_ids: string[] }) {
      if (fn !== "set_session_exercises") throw new Error(`rpc desconocida: ${fn}`);
      if (!tableOf("sessions").has(args.p_session_id)) {
        return { error: new Error("Sesión no encontrada") };
      }
      for (let i = sessionExercises.length - 1; i >= 0; i--) {
        if (sessionExercises[i]?.session_id === args.p_session_id) sessionExercises.splice(i, 1);
      }
      args.p_exercise_ids.forEach((exerciseId, position) =>
        sessionExercises.push({ session_id: args.p_session_id, exercise_id: exerciseId, position }),
      );
      return { error: null };
    },
    storage: {
      from: () => ({
        upload: async (path: string, blob: Blob) => {
          files.set(path, blob);
          return { error: null };
        },
        remove: async (paths: string[]) => {
          for (const p of paths) files.delete(p);
          return { error: null };
        },
        download: async (path: string) =>
          files.has(path)
            ? { data: files.get(path), error: null }
            : { data: null, error: new Error("not found") },
      }),
    },
  };

  return { client: client as unknown as SyncClient, tables, files, sessionExercises };
}
