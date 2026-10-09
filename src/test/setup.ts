import "fake-indexeddb/auto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// El Blob de jsdom no sobrevive al structuredClone de fake-indexeddb (en los navegadores
// reales sí): usamos el de Node, que se clona igual que en Safari.
globalThis.Blob = NodeBlob as unknown as typeof Blob;
globalThis.File = NodeFile as unknown as typeof File;

// jsdom no implementa <dialog>.showModal()/close().
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

// Las pantallas se cargan en diferido (lazy): con toda la batería en paralelo, la primera
// carga puede pasar de 1 s. Damos margen para que los tests no fallen al azar.
configure({ asyncUtilTimeout: 5000 });

// Sin `globals: true`, Testing Library no limpia el DOM entre tests automáticamente.
afterEach(() => cleanup());
