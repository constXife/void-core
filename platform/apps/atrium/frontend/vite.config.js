import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const repoRoot = resolve(__dirname, "..");
  const envFile = resolve(repoRoot, ".env");
  const hasEnvFile = existsSync(envFile);
  const isDev = mode === "development";
  const env = isDev && hasEnvFile ? loadEnv(mode, repoRoot, "") : {};
  const readEnv = (key) => (env[key] || "").trim();

  const devAllowedEmails = readEnv("AUTH_ALLOWED_EMAILS");
  const devAdminEmails = readEnv("AUTH_ADMIN_EMAILS");
  const devLocalEmail = readEnv("AUTH_LOCAL_ADMIN_EMAIL");
  const devLocalPassword = readEnv("AUTH_LOCAL_ADMIN_PASSWORD");

  return {
    plugins: [vue()],
    define: {
      __ATRIUM_DEV_ENV_PRESENT__: JSON.stringify(isDev && hasEnvFile),
      __ATRIUM_DEV_AUTH_ALLOWED_EMAILS__: JSON.stringify(isDev && hasEnvFile ? devAllowedEmails : ""),
      __ATRIUM_DEV_AUTH_ADMIN_EMAILS__: JSON.stringify(isDev && hasEnvFile ? devAdminEmails : ""),
      __ATRIUM_DEV_AUTH_LOCAL_EMAIL__: JSON.stringify(isDev && hasEnvFile ? devLocalEmail : ""),
      __ATRIUM_DEV_AUTH_LOCAL_PASSWORD__: JSON.stringify(isDev && hasEnvFile ? devLocalPassword : "")
    },
    server: {
      port: 5173,
      proxy: {
        "/api": "http://localhost:8080",
        "/auth": "http://localhost:8080"
      }
    },
    build: {
      outDir: "../backend/internal/web/dist",
      emptyOutDir: true
    }
  };
});
