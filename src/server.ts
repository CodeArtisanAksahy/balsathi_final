import { createServer, type IncomingMessage } from "node:http";
import { pathToFileURL } from "node:url";
import { ApiError } from "./lib/authorization";
import { errorResponse, jsonResponse, MAX_BODY_BYTES } from "./lib/api";
import * as children from "./app/api/children/route";
import * as observations from "./app/api/observations/route";

async function requestBody(incoming: IncomingMessage): Promise<string | undefined> {
  if (incoming.method === "GET" || incoming.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of incoming) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > MAX_BODY_BYTES) throw new ApiError(413, "BODY_TOO_LARGE", "Request body is too large.");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

// A small Node adapter makes the Next-compatible handlers runnable without Next or a DB.
export function createDemoServer() {
  return createServer(async (incoming, outgoing) => {
    let response: Response;
    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
      const request = new Request(new URL(incoming.url ?? "/", "http://127.0.0.1"), {
        method: incoming.method, headers, body: await requestBody(incoming),
      });
      const pathname = new URL(request.url).pathname.replace(/\/$/, "");
      const handlers = pathname === "/api/children" ? children : pathname === "/api/observations" ? observations : null;
      if (pathname === "/api/health" && request.method === "GET") {
        response = jsonResponse({ status: "ok", database: "not-connected", externalAI: false });
      } else if (!handlers) {
        response = errorResponse(new ApiError(404, "NOT_FOUND", "Endpoint not found."));
      } else if (request.method !== "GET" && request.method !== "POST") {
        response = errorResponse(new ApiError(405, "METHOD_NOT_ALLOWED", "Use GET or POST."));
        response.headers.set("Allow", "GET, POST");
      } else {
        response = await handlers[request.method](request);
      }
    } catch (error) {
      response = errorResponse(error);
    }
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, name) => { responseHeaders[name] = value; });
    outgoing.writeHead(response.status, responseHeaders);
    outgoing.end(await response.text());
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("API_PORT must be between 1 and 65535.");
  createDemoServer().listen(port, "127.0.0.1", () => {
    console.info(`Balsathi DEMO API: http://127.0.0.1:${port} — simulated identity, in-memory data, no external AI`);
  });
}
