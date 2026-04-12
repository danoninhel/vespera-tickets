import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: false,
    include: ["src/__tests__/**/*.spec.ts"],
    alias: [
      { find: /^\.\.\/services\/(.*)/, replacement: "./src/services/$1" },
      { find: /^\.\.\/lib\/(.*)/, replacement: "./src/lib/$1" },
    ],
  },
});