import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    port: 8080,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router"],
  },
  resolve: {
    dedupe: ["react", "react-dom", "react-router"],
  },
});
