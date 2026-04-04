import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    hookTimeout: 15_000, // 15 seconds for the tests to complete
  },
});
