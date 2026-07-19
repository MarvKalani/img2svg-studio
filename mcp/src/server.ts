import { createMcpHttpServer } from "./http-server.js";

const port = readPort(process.env.PORT);
const server = createMcpHttpServer();

server.listen(port, "0.0.0.0", () => {
  console.log(`img2svg Studio MCP server listening on http://0.0.0.0:${port}/mcp`);
});

function readPort(value: string | undefined): number {
  const port = value === undefined ? 8787 : Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError("PORT must be an integer from 1 to 65535.");
  }
  return port;
}
