import { createBrowserRouter } from "react-router";
import { ExercisesPage } from "@/pages/ExercisesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlanPage } from "@/pages/PlanPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TodayPage } from "@/pages/TodayPage";
import { Layout } from "./Layout";

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { index: true, element: <TodayPage /> },
        { path: "plan", element: <PlanPage /> },
        { path: "ejercicios", element: <ExercisesPage /> },
        { path: "ajustes", element: <SettingsPage /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ],
  // La app vive en /WellPlan/ (GitHub Pages).
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);
