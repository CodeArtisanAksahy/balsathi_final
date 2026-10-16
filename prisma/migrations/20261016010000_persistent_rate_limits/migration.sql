CREATE TABLE "RateLimitBucket" (
  "bucketKey" TEXT NOT NULL PRIMARY KEY,
  "windowStartedAt" DATETIME NOT NULL,
  "count" INTEGER NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "RateLimitBucket_windowStartedAt_idx" ON "RateLimitBucket"("windowStartedAt");
