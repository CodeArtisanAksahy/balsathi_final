import type { AppLocale } from "./domain";

export type DataMode = "demo" | "postgres";

const developmentAuthSecret = "balsathi-dev-only-secret-change-me";

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function envNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.toLowerCase().trim();
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "yes";
}

export const config = {
  dataMode: env("DATA_MODE", "demo") as DataMode,
  appOrigin: env("APP_ORIGIN", "http://localhost:3000"),
  databaseUrl: env("DATABASE_URL", ""),
  authSecret: env("AUTH_SECRET", developmentAuthSecret),
  sessionCookie: env("SESSION_COOKIE", "balsathi_session"),
  sessionTtlHours: envNumber("SESSION_TTL_HOURS", 12),

  llm: {
    apiKey: env("LLM_API_KEY", ""),
    baseUrl: env("LLM_BASE_URL", "https://api.openai.com/v1"),
    model: env("LLM_MODEL", "gpt-4o-mini"),
  },

  stt: {
    provider: env("STT_PROVIDER", "demo"),
    apiKey: env("STT_API_KEY", ""),
  },

  s3: {
    endpoint: env("S3_ENDPOINT", ""),
    region: env("S3_REGION", "us-east-1"),
    bucket: env("S3_BUCKET", ""),
    accessKeyId: env("S3_ACCESS_KEY_ID", ""),
    secretAccessKey: env("S3_SECRET_ACCESS_KEY", ""),
    forcePathStyle: envBool("S3_FORCE_PATH_STYLE", true),
  },

  storage: {
    localDir: env("LOCAL_STORAGE_DIR", "./uploads"),
    publicBaseUrl: env("STORAGE_PUBLIC_BASE_URL", ""),
  },

  rateLimit: {
    chatMaxPerMinute: envNumber("CHAT_RATE_LIMIT_PER_MIN", 10),
  },

  defaultLocale: env("DEFAULT_LOCALE", "en") as AppLocale,
  isProduction: process.env.NODE_ENV === "production",
};

export function assertSecureAuthConfiguration(): void {
  if (config.isProduction && config.authSecret === developmentAuthSecret) {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
}

export function isPostgresMode(): boolean {
  return config.dataMode === "postgres";
}

export function isDemoMode(): boolean {
  return config.dataMode === "demo";
}

export function llmEnabled(): boolean {
  return config.llm.apiKey.length > 0;
}

export function s3Enabled(): boolean {
  return config.s3.endpoint.length > 0 && config.s3.bucket.length > 0;
}
