import type { AddressInfo } from "node:net";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, test } from "vitest";

import { createMcpHttpServer } from "./http-server.js";

const circleFixture = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);
const openClients: Client[] = [];
const openServers: ReturnType<typeof createMcpHttpServer>[] = [];

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
  await Promise.all(
    openServers
      .splice(0)
      .map((server) => new Promise<void>((resolveClose) => server.close(() => resolveClose()))),
  );
});

describe("Streamable HTTP MCP server", () => {
  test("Given a stateless client, when tools are listed and the circle fixture is called, then vectorize_image returns SVG statistics", async () => {
    const client = await connectClient();
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toEqual(["vectorize_image"]);
    expect(tools.tools[0]?._meta?.["openai/fileParams"]).toEqual(["image"]);
    expect(tools.tools[0]?.annotations).toMatchObject({
      openWorldHint: true,
      readOnlyHint: true,
    });

    const imageBase64 = (await readFile(circleFixture)).toString("base64");
    const result = await client.callTool({
      arguments: {
        color_count: 4,
        detail_level: "low",
        image_base64: imageBase64,
        mode: "shapes",
      },
      name: "vectorize_image",
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual(
      expect.objectContaining({
        stats: expect.objectContaining({ circleCount: 1, pathCount: 0 }),
        svg: expect.stringMatching(/^<svg\b/u),
      }),
    );
  });
});

async function connectClient(): Promise<Client> {
  const server = createMcpHttpServer();
  openServers.push(server);
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const port = (server.address() as AddressInfo).port;
  const client = new Client({ name: "img2svg-test", version: "0.1.0" });
  openClients.push(client);
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
  return client;
}
