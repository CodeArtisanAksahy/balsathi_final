import { describe, expect, it } from "vitest";
import { assertSameOrigin, enforceRateLimit } from "./request-security";
import { ApiError } from "./authorization";

describe("request security", () => {
  it("permits the configured same-origin request and rejects a foreign origin", () => {
    expect(() => assertSameOrigin(new Request("http://localhost", { headers: { origin: "http://localhost:3000" } }))).not.toThrow();
    expect(() => assertSameOrigin(new Request("http://localhost", { headers: { origin: "https://attacker.example" } }))).toThrowError(ApiError);
  });

  it("rejects state-changing requests without an origin or referer", () => {
    expect(() => assertSameOrigin(new Request("http://localhost"))).toThrowError(ApiError);
  });

  it("limits repeated requests per keyed client bucket", () => {
    const key = `test-${Date.now()}`;
    const request = () => new Request("http://localhost", { headers: { "x-forwarded-for": "192.0.2.1" } });
    expect(() => enforceRateLimit(request(), key, 2)).not.toThrow();
    expect(() => enforceRateLimit(request(), key, 2)).not.toThrow();
    expect(() => enforceRateLimit(request(), key, 2)).toThrowError(ApiError);
  });
});
