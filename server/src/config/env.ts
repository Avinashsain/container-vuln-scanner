import "dotenv/config";
import path from "node:path";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  cookieName: "token",
  cookieSecure: (process.env.COOKIE_SECURE ?? "false") === "true",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  // Directory containing .trivyignore + configs/ — trivy is spawned with this as cwd
  // so the repo's existing .trivyignore is picked up automatically.
  repoRoot: path.resolve(process.env.REPO_ROOT ?? "..") ,
  reportsDir: path.resolve(process.env.REPORTS_DIR ?? "../reports"),
};

export const isProduction = env.nodeEnv === "production";
