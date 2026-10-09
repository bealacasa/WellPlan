import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sin `globals: true`, Testing Library no limpia el DOM entre tests automáticamente.
afterEach(() => cleanup());
