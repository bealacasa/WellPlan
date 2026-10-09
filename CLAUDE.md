# WellPlan

PWA mobile-first para seguir el plan de gimnasio y los ejercicios de la fisio: ejercicios con foto,
registro de kilos, sesiones, plan semanal y modo entrenamiento. Interfaz en español. Usuario
principal: una persona en el gimnasio, con una mano y a menudo sin cobertura.

## Comandos

```bash
npm run dev          # http://localhost:5173/WellPlan/
npm run verify       # lint + typecheck + tests
npm run build        # build de producción (CSP en <meta>, service worker, 404.html)
npm run preview      # sirve dist/ en http://localhost:4173/WellPlan/
npm run db:push      # aplica supabase/migrations al proyecto enlazado
npm run db:types     # regenera src/sync/database.types.ts
```

Node 24 (`.nvmrc`). En Windows/Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"`.

## Arquitectura (offline-first)

- **Dexie (IndexedDB) es la fuente de verdad de la UI.** Se lee y escribe siempre en local; nunca se
  espera a la red.
- `src/db/`: esquema (`database.ts`), tipos (`types.ts`) y helpers de registro (`records.ts`).
  Los componentes NO usan Dexie directamente: pasan por `src/db/repositories/` (desde la Fase 2).
- `src/sync/`: Supabase (auth + sincronización). Todo registro sincronizable lleva `id` UUID
  generado en el cliente, `createdAt`, `updatedAt`, `deletedAt` (borrado lógico) y `dirty` (0/1).
  Conflictos: gana el `updatedAt` más reciente. El servidor pone `server_updated_at` (cursor de bajada).
- Cambios de esquema local: nueva `this.version(n + 1)` en `database.ts`, nunca editar una publicada.
- Cambios de esquema remoto: nueva migración en `supabase/migrations/`, con comentarios didácticos.
- Desplegada en GitHub Pages bajo `/WellPlan/` (`base` en `vite.config.ts`, `basename` del router).

## Reglas de seguridad y privacidad

- Datos de salud (indicaciones de la fisio, notas): solo en el dispositivo y en el Supabase del
  usuario (UE), protegidos por login + RLS (`user_id = auth.uid()` en todas las tablas) y FKs
  compuestas `(id, user_id)` para no enlazar con filas ajenas.
- Sin analítica, trackers, fuentes ni scripts de terceros. La única conexión externa es Supabase.
- CSP en `<meta>` (solo en build, `src/lib/csp.ts`): sin `unsafe-inline`/`unsafe-eval`. Por tanto:
  nada de `style={{…}}` en el HTML de la app, ni `dangerouslySetInnerHTML` (lint lo prohíbe), ni
  scripts inline (el service worker se registra desde el bundle con `virtual:pwa-register/react`).
- Solo variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en el cliente (públicas por
  diseño). Nunca la clave secreta.
- Toda entrada (formularios, archivos importados) se valida con Zod. Confirmación antes de borrar.
- Dependencias con versión exacta y al menos 14 días de antigüedad (salvo parches de seguridad).

## UI

- Objetivos táctiles ≥ 48px (`min-h-12`/`min-h-14`), alto contraste, tokens de color en `index.css`.
- Inputs ≥ 16px (sin zoom en iOS); `inputMode="decimal"` para kilos y aceptar coma decimal.
- Safe areas con `env(safe-area-inset-*)`; modo oscuro automático; `prefers-reduced-motion`.

## Cierre de cada fase

`npm run verify` y `npm run build` en verde, y resumen de cómo probarlo en el iPhone.
