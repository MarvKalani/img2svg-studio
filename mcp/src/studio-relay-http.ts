import type { IncomingMessage, ServerResponse } from "node:http";

import { StudioRelayError, type StudioRelay } from "./studio-relay.js";

const relayPath = "/studio-relay";
const maximumBodyBytes = 64 * 1024;

export async function handleStudioRelayRequest(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  relay: StudioRelay,
): Promise<boolean> {
  if (!url.pathname.startsWith(relayPath)) {
    return false;
  }
  const host = request.headers.host;
  if (!host || !/^(?:127\.0\.0\.1|localhost):\d+$/u.test(host)) {
    response.writeHead(403).end("Forbidden");
    return true;
  }
  const origin = request.headers.origin;
  if (!origin || !isAllowedStudioOrigin(origin)) {
    response.writeHead(403).end("Forbidden");
    return true;
  }
  setRelayCorsHeaders(response, origin);
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return true;
  }

  try {
    if (request.method === "POST" && url.pathname === `${relayPath}/sessions`) {
      writeJson(response, 201, relay.createSession());
      return true;
    }
    const sessionId = request.headers["x-studio-relay-session"];
    const token = request.headers["x-studio-relay-token"];
    if (typeof sessionId !== "string" || typeof token !== "string") {
      writeJson(response, 401, { code: "invalid_session", ok: false });
      return true;
    }
    if (request.method === "GET" && url.pathname === `${relayPath}/commands`) {
      const command = relay.poll(sessionId, token);
      if (command) {
        writeJson(response, 200, command);
      } else {
        response.writeHead(204).end();
      }
      return true;
    }
    if (request.method === "POST" && url.pathname === `${relayPath}/results`) {
      const body = await readJsonBody(request);
      if (!isResultBody(body)) {
        writeJson(response, 400, { code: "invalid_result", ok: false });
        return true;
      }
      const accepted = relay.submitResult(sessionId, token, body.commandId, body.result);
      writeJson(response, accepted ? 200 : 404, { accepted, ok: accepted });
      return true;
    }
    if (request.method === "DELETE" && url.pathname === `${relayPath}/sessions`) {
      const disconnected = relay.closeSession(sessionId, token);
      writeJson(response, disconnected ? 200 : 404, { disconnected, ok: disconnected });
      return true;
    }
  } catch (error) {
    if (error instanceof StudioRelayError) {
      writeJson(response, 401, { code: error.code, message: error.message, ok: false });
      return true;
    }
    writeJson(response, 400, { code: "invalid_request", ok: false });
    return true;
  }

  response.writeHead(404).end("Not Found");
  return true;
}

function isAllowedStudioOrigin(origin: string): boolean {
  return (
    origin === "https://studio.img2.download" ||
    /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/u.test(origin)
  );
}

function setRelayCorsHeaders(response: ServerResponse, origin: string): void {
  response.setHeader("access-control-allow-headers", [
    "content-type",
    "x-studio-relay-session",
    "x-studio-relay-token",
  ]);
  response.setHeader("access-control-allow-methods", "DELETE, GET, OPTIONS, POST");
  response.setHeader("access-control-allow-origin", origin);
  response.setHeader("access-control-allow-private-network", "true");
  response.setHeader("cache-control", "no-store");
  response.setHeader("vary", "Origin");
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maximumBodyBytes) {
      throw new RangeError("Relay request body is too large.");
    }
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function isResultBody(value: unknown): value is { commandId: string; result: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "commandId" in value &&
    typeof value.commandId === "string" &&
    "result" in value &&
    typeof value.result === "string"
  );
}

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}
