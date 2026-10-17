import { createHash, createHmac } from "node:crypto";
import { ApiError } from "./authorization";
import { config } from "./config";

type Bucket = { start: number; count: number };
const globalForLimits = globalThis as typeof globalThis & { balsathiRateLimits?: Map<string, Bucket> };
const buckets = globalForLimits.balsathiRateLimits ?? new Map<string, Bucket>();
globalForLimits.balsathiRateLimits = buckets;

/** Same-origin check for cookie-authenticated state changes. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) throw new ApiError(403, "ORIGIN_REQUIRED", "A same-origin Origin or Referer header is required.");
  let expected: string;
  try { expected = new URL(config.appOrigin).origin; } catch { throw new ApiError(503, "APP_ORIGIN_INVALID", "Application origin is not configured correctly."); }
  let actual: string;
  try { actual = new URL(origin).origin; } catch { throw new ApiError(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed."); }
  const expectedUrl = new URL(expected);
  const actualUrl = new URL(actual);
  const isLoopback = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const localAlias = !config.isProduction
    && isLoopback(expectedUrl.hostname)
    && isLoopback(actualUrl.hostname)
    && expectedUrl.protocol === actualUrl.protocol
    && expectedUrl.port === actualUrl.port;
  if (actual !== expected && !localAlias) throw new ApiError(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed.");
}
/** Process-local limit intended as a single-instance guard, not a distributed production limit. */
export function enforceRateLimit(request: Request, key: string, limit: number, windowMs = 60_000): void {
  const now = Date.now();
  const rawClient = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown";
  const clientHash = createHash("sha256").update(rawClient).digest("hex").slice(0, 16);
  const bucketKey = `${key}:${clientHash}`;
  const existing = buckets.get(bucketKey);
  if (!existing || now - existing.start >= windowMs) {
    buckets.set(bucketKey, { start: now, count: 1 });
    if (buckets.size > 10_000) {
      for (const [storedKey, bucket] of buckets) if (now - bucket.start >= windowMs) buckets.delete(storedKey);
    }
    return;
  }
  existing.count += 1;
  if (existing.count > limit) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Try again shortly.");
}

/** Single-host persistent limiting for SQLite deployments. The reverse proxy must sanitize client IP headers. */
export async function enforceConfiguredRateLimit(request: Request, key: string, limit: number, windowMs = 60_000): Promise<void> {
  if (config.dataMode !== "sqlite") {
    enforceRateLimit(request, key, limit, windowMs);
    return;
  }
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);
  const rawClient = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    ?? request.headers.get("x-real-ip")?.trim()
    ?? "unknown";
  const clientHash = createHmac("sha256", config.authSecret).update(rawClient).digest("hex").slice(0, 24);
  const bucketKey = `${key}:${clientHash}`;
  try {
    const { prisma } = await import("./prisma");
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "RateLimitBucket" ("bucketKey", "windowStartedAt", "count", "updatedAt")
        VALUES (${bucketKey}, ${now}, 1, ${now})
        ON CONFLICT("bucketKey") DO UPDATE SET
          "windowStartedAt" = CASE WHEN "RateLimitBucket"."windowStartedAt" <= ${cutoff} THEN excluded."windowStartedAt" ELSE "RateLimitBucket"."windowStartedAt" END,
          "count" = CASE WHEN "RateLimitBucket"."windowStartedAt" <= ${cutoff} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
          "updatedAt" = excluded."updatedAt"
      `;
      const bucket = await tx.rateLimitBucket.findUniqueOrThrow({ where: { bucketKey } });
      if (bucket.count > limit) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Try again shortly.");
      if (bucket.count % 100 === 0) await tx.rateLimitBucket.deleteMany({ where: { windowStartedAt: { lt: cutoff } } });
    }, { maxWait: 2_000, timeout: 4_000 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "RATE_LIMIT_UNAVAILABLE", "Login protection is temporarily unavailable. Try again shortly.");
  }
}
