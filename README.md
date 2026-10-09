# WellPlan

App web instalable (PWA) para seguir el plan de gimnasio y los ejercicios de fisioterapia:
ejercicios con foto, registro de kilos, sesiones, plan semanal y modo entrenamiento. Funciona sin
conexión y guarda una copia en la nube (Supabase, UE) si inicias sesión.

**App:** https://bealacasa.github.io/WellPlan/

## Desarrollo

```bash
npm ci
npm run dev       # http://localhost:5173/WellPlan/
npm run verify    # lint + typecheck + tests
```

Sin `.env.local` la app funciona solo en local (sin nube).

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) en la región **Central EU (Frankfurt)**.
2. Copia `.env.example` a `.env.local` con la URL y la clave publicable (Project Settings → API Keys).
3. Aplica el esquema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
4. Authentication → URL Configuration: Site URL `https://bealacasa.github.io/WellPlan/`.
5. Authentication → Email Templates (Magic Link): usa `supabase/templates/otp.html` (código de 6 dígitos).
6. Authentication → Passkeys: actívalas con Relying Party `bealacasa.github.io`.
7. En GitHub → Settings → Secrets and variables → Actions → **Variables**: añade
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Despliegue

Cada push a `main` pasa los controles de calidad y publica en GitHub Pages
(Settings → Pages → Source: **GitHub Actions**).
