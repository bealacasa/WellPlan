import { createBrowserRouter } from "react-router";
import { TodayPage } from "@/pages/TodayPage";
import { Layout } from "./Layout";

/*
 * "Hoy" va en el paquete inicial (es la primera pantalla). El resto se descarga al abrirlo;
 * con la app instalada el service worker ya las tiene en caché, así que es instantáneo.
 */
export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <TodayPage /> },
        {
          path: "plan",
          lazy: async () => ({ Component: (await import("@/pages/PlanPage")).PlanPage }),
        },
        {
          path: "ejercicios",
          lazy: async () => ({ Component: (await import("@/pages/ExercisesPage")).ExercisesPage }),
        },
        {
          path: "ejercicios/nuevo",
          lazy: async () => ({
            Component: (await import("@/pages/ExerciseFormPage")).ExerciseFormPage,
          }),
        },
        {
          path: "ejercicios/:id",
          lazy: async () => ({
            Component: (await import("@/pages/ExerciseDetailPage")).ExerciseDetailPage,
          }),
        },
        {
          path: "ejercicios/:id/editar",
          lazy: async () => ({
            Component: (await import("@/pages/ExerciseFormPage")).ExerciseFormPage,
          }),
        },
        {
          path: "sesiones",
          lazy: async () => ({ Component: (await import("@/pages/SessionsPage")).SessionsPage }),
        },
        {
          path: "sesiones/nueva",
          lazy: async () => ({
            Component: (await import("@/pages/SessionFormPage")).SessionFormPage,
          }),
        },
        {
          path: "sesiones/:id",
          lazy: async () => ({
            Component: (await import("@/pages/SessionFormPage")).SessionFormPage,
          }),
        },
        {
          path: "horario",
          lazy: async () => ({ Component: (await import("@/pages/SchedulePage")).SchedulePage }),
        },
        {
          path: "horario/nueva",
          lazy: async () => ({
            Component: (await import("@/pages/GymClassFormPage")).GymClassFormPage,
          }),
        },
        {
          path: "horario/:id",
          lazy: async () => ({
            Component: (await import("@/pages/GymClassFormPage")).GymClassFormPage,
          }),
        },
        {
          path: "ajustes",
          lazy: async () => ({ Component: (await import("@/pages/SettingsPage")).SettingsPage }),
        },
        {
          path: "*",
          lazy: async () => ({ Component: (await import("@/pages/NotFoundPage")).NotFoundPage }),
        },
      ],
    },
  ],
  // La app vive en /WellPlan/ (GitHub Pages).
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);
