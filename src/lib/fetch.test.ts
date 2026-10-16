import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./fetch";

describe("apiFetch request headers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the JSON content type when a request adds an idempotency header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "child-1" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/children", {
      method: "POST",
      headers: { "Idempotency-Key": "runtime-test-key" },
      body: JSON.stringify({ fullName: "Runtime Test Child" }),
    });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(request.headers).get("Idempotency-Key")).toBe("runtime-test-key");
  });
});
