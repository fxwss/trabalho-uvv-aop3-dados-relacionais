import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    // Os testes batem no mesmo banco: rodar em sequencia evita corrida entre arquivos.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
