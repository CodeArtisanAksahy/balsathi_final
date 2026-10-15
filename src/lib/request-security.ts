import { createHash } from "node:crypto";
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
  if (actual !== expected) throw new ApiError(403, "ORIGIN_FORBIDDEN", "Request origin is not allowed.");
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
