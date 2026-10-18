import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./app/router";
import { startPlanCleanup } from "./db/repositories/plan";
import { syncAllLastKg } from "./db/repositories/weightLogs";
import { startSync } from "./sync/controller";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró #root");

startSync();
startPlanCleanup();
void syncAllLastKg().catch(() => undefined);

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
