import { createServer, type Server } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createImg2SvgMcpServer } from "./mcp-app.js";

const mcpPath = "/mcp";
const mcpMethods = new Set(["DELETE", "GET", "POST"]);

export function createMcpHttpServer(): Server {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (request.method === "OPTIONS" && url.pathname === mcpPath) {
      response.writeHead(204, corsHeaders()).end();
      return;
    }
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("img2svg Studio MCP server");
      return;
    }
    if (!request.method || url.pathname !== mcpPath || !mcpMethods.has(request.method)) {
      response.writeHead(404).end("Not Found");
      return;
    }

    for (const [name, value] of Object.entries(corsHeaders())) {
      response.setHeader(name, value);
    }
    const server = createImg2SvgMcpServer();
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
      sessionIdGenerator: undefined,
    });
    response.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request, response);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!response.headersSent) {
        response.writeHead(500).end("Internal Server Error");
      }
    }
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-headers": "content-type, mcp-session-id",
    "access-control-allow-methods": "POST, GET, DELETE, OPTIONS",
    "access-control-allow-origin": "*",
    "access-control-expose-headers": "Mcp-Session-Id",
  };
}
