import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // 新检索和新图谱接口分别代理；其余未迁移接口继续访问旧后端。
  const oldApiTarget =
    env.VITE_OLD_API_TARGET ||
    env.VITE_API_TARGET ||
    env.VITE_API_BASE ||
    "http://47.110.47.12";
  const retrievalTarget =
    env.VITE_RETRIEVAL_TARGET || "http://127.0.0.1:18080";
  const kgTarget =
    env.VITE_KG_TARGET || "http://47.110.47.12";

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api/retrieval": {
          target: retrievalTarget,
          changeOrigin: true,
          // /api/retrieval/search -> /search；/api/retrieval/health -> /health
          rewrite: (path) => path.replace(/^\/api\/retrieval/, ""),
        },
        "/api/kg": {
          target: kgTarget,
          changeOrigin: true,
        },
        "/api": {
          target: oldApiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
