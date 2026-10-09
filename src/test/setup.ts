import "fake-indexeddb/auto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { cleanup } from "@testing-library/react";
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

// Sin `globals: true`, Testing Library no limpia el DOM entre tests automáticamente.
afterEach(() => cleanup());
