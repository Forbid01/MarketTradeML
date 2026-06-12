import { defineConfig } from "vitest/config";
import path from "node:path";

// "@/..." alias-ийг jsconfig-тэй ижилхэн тохируулна.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
