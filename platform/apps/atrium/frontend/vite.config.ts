import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const repoRoot = decodeURIComponent(new URL("..", import.meta.url).pathname);
  const env = isDev ? loadEnv(mode, repoRoot, "") : {};
  const readEnv = (key: string) => (env[key] || "").trim();

  const devAllowedEmails = readEnv("AUTH_ALLOWED_EMAILS");
  const devAdminEmails = readEnv("AUTH_ADMIN_EMAILS");
  const devLocalEmail = readEnv("AUTH_LOCAL_ADMIN_EMAIL");
  const devLocalPassword = readEnv("AUTH_LOCAL_ADMIN_PASSWORD");

  return {
    plugins: [vue()],
    define: {
      __ATRIUM_DEV_ENV_PRESENT__: JSON.stringify(isDev),
      __ATRIUM_DEV_AUTH_ALLOWED_EMAILS__: JSON.stringify(isDev ? devAllowedEmails : ""),
      __ATRIUM_DEV_AUTH_ADMIN_EMAILS__: JSON.stringify(isDev ? devAdminEmails : ""),
      __ATRIUM_DEV_AUTH_LOCAL_EMAIL__: JSON.stringify(isDev ? devLocalEmail : ""),
      __ATRIUM_DEV_AUTH_LOCAL_PASSWORD__: JSON.stringify(isDev ? devLocalPassword : "")
    },
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:8080",
        "/auth": "http://localhost:8080"
      }
    },
    test: {
      environment: "jsdom",
      globals: true
    },
    build: {
      outDir: "../backend/internal/web/dist",
      emptyOutDir: true
    }
  };
});
