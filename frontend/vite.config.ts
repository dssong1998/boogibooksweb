import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // .well-known 경로 요청 무시 (Chrome DevTools 자동 요청)
    {
      name: "ignore-wellknown",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/.well-known/")) {
            res.statusCode = 404;
            res.end();
            return;
          }
          next();
        });
      },
    },
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
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
