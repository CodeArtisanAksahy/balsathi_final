import { ZodError } from "zod";
import { ApiError } from "./authorization";
import { assertSameOrigin } from "./request-security";

export const MAX_BODY_BYTES = 262_144;

export async function readJson(request: Request): Promise<unknown> {
  assertSameOrigin(request);
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApiError(415, "JSON_REQUIRED", "Use Content-Type: application/json.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new ApiError(413, "BODY_TOO_LARGE", `Request body exceeds ${MAX_BODY_BYTES} bytes.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }
}

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(
    { data, meta: { mode: process.env.DATA_MODE ?? "demo", generatedAt: new Date().toISOString() } },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Balsathi-Mode": process.env.DATA_MODE ?? "demo", ...headers },
    },
  );
}

export function errorResponse(error: unknown): Response {
  let status = 500;
  let body: { code: string; message: string; issues?: unknown } = {
    code: "INTERNAL_ERROR",
    message: "Unable to complete the request.",
  };
  if (error instanceof ApiError) {
    status = error.status;
    body = { code: error.code, message: error.message };
  } else if (error instanceof ZodError) {
    status = 400;
    body = {
      code: "VALIDATION_ERROR",
      message: "Check the request fields.",
      issues: error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
    };
  }
  return Response.json(
    { error: body, meta: { mode: process.env.DATA_MODE ?? "demo", generatedAt: new Date().toISOString() } },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Balsathi-Mode": process.env.DATA_MODE ?? "demo" },
    },
  );
}
