// GitHub Pages no sabe que es una SPA: sirve 404.html en rutas como /WellPlan/plan.
// Copiamos index.html para que esas rutas carguen la app (luego el service worker las sirve offline).
import { copyFileSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
console.log("dist/404.html creado");
