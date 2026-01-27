import { defineProject } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      "web/tests/utils": path.resolve(__dirname, "./tests/web-utils.tsx"),
      "web/utils/string": path.resolve(__dirname, "./tests/string-utils.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    coverage: {
      include: ["src/**/*"],
    },
  },
});
