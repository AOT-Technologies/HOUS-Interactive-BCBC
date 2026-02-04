import { defineProject } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@repo/ui/sidebar": path.resolve(__dirname, "../../packages/ui/src/sidebar/Sidebar.tsx"),
      "@repo/ui/content-panel": path.resolve(__dirname, "../../packages/ui/src/content-panel/ContentPanel.tsx"),
      "@repo/constants/src/testids": path.resolve(__dirname, "../../packages/constants/src/testids.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    coverage: {
      include: ["components/**/*", "app/**/*", "hooks/**/*", "lib/**/*"],
    },
  },
});
