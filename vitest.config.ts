import { resolve } from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/": resolve(__dirname, "./src/") + "/",
    },
  },
  test: {
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**", "src/hooks/**", "src/components/**"],
    },
  },
});
