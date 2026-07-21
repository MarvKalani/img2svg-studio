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
    const { client } = await connectClient();
    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "get_workspace_state",
      "list_conversion_presets",
      "save_conversion_preset",
      "load_conversion_preset",
      "configure_conversion",
      "convert_current_image",
      "preview_magic_wand_selection",
      "apply_magic_wand_selection",
      "analyze_image",
      "remove_background_region",
      "vectorize_image",
      "get_svg_preview",
    ]);
    const analyzeTool = tools.tools.find((tool) => tool.name === "analyze_image");
    const removeTool = tools.tools.find((tool) => tool.name === "remove_background_region");
    const vectorizeTool = tools.tools.find((tool) => tool.name === "vectorize_image");
    const previewTool = tools.tools.find((tool) => tool.name === "get_svg_preview");
    expect(vectorizeTool?._meta?.["openai/fileParams"]).toEqual(["image"]);
    expect(analyzeTool?._meta?.["openai/fileParams"]).toEqual(["image"]);
    expect(removeTool?._meta?.["openai/fileParams"]).toEqual(["image"]);
    expect(vectorizeTool?.annotations).toMatchObject({
      openWorldHint: true,
      readOnlyHint: true,
    });
    expect(previewTool?._meta?.ui).toEqual({ resourceUri: "ui://img2svg/preview.html" });

    const imageBase64 = (await readFile(circleFixture)).toString("base64");
    const analysis = await client.callTool({
      arguments: { image_base64: imageBase64, sensitivity_percent: 0 },
      name: "analyze_image",
    });
    expect(analysis.isError).not.toBe(true);
    expect(analysis.content).toEqual(
      expect.arrayContaining([expect.objectContaining({ mimeType: "image/png", type: "image" })]),
    );
    expect(analysis.structuredContent).not.toHaveProperty("previewPngBase64");
    const regions = (
      analysis.structuredContent as { regions: { seed: { x: number; y: number } }[] }
    ).regions;
    expect(regions.length).toBeGreaterThan(0);

    const removed = await client.callTool({
      arguments: {
        image_base64: imageBase64,
        seed: regions[0]?.seed,
        sensitivity_percent: 0,
      },
      name: "remove_background_region",
    });
    expect(removed.isError).not.toBe(true);
    expect(removed.content).toEqual(
      expect.arrayContaining([expect.objectContaining({ mimeType: "image/png", type: "image" })]),
    );
    const editedImageBase64 = (removed.structuredContent as { imagePngBase64: string })
      .imagePngBase64;
    const result = await client.callTool({
      arguments: {
        color_count: 4,
        detail_level: "low",
        image_base64: editedImageBase64,
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

    const svg = (result.structuredContent as { svg: string }).svg;
    const previewResult = await client.callTool({
      arguments: { svg },
      name: "get_svg_preview",
    });
    expect(previewResult.isError).not.toBe(true);
    expect(previewResult.structuredContent).toEqual(
      expect.objectContaining({
        stats: { byteSize: 142, circleCount: 1, elementCount: 1, pathCount: 0 },
        svg,
      }),
    );

    const resources = await client.listResources();
    expect(resources.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mimeType: "text/html;profile=mcp-app",
          uri: "ui://img2svg/preview.html",
        }),
      ]),
    );
    const widget = await client.readResource({ uri: "ui://img2svg/preview.html" });
    expect(widget.contents[0]).toEqual(
      expect.objectContaining({
        mimeType: "text/html;profile=mcp-app",
        text: expect.stringContaining('id="svg-preview"'),
      }),
    );
  });

  test("Given a connected visible Studio, when ChatGPT calls a relay tool, then the browser command result completes the MCP call", async () => {
    const { baseUrl, client } = await connectClient();
    const origin = "http://127.0.0.1:5173";
    const sessionResponse = await fetch(`${baseUrl}/studio-relay/sessions`, {
      headers: { origin },
      method: "POST",
    });
    const session = (await sessionResponse.json()) as { sessionId: string; token: string };
    const resultPromise = client.callTool({
      arguments: {},
      name: "list_conversion_presets",
    });
    const command = await pollCommand(baseUrl, origin, session);

    expect(command).toMatchObject({ input: {}, toolName: "list_conversion_presets" });
    const submitted = await fetch(`${baseUrl}/studio-relay/results`, {
      body: JSON.stringify({
        commandId: command.commandId,
        result: JSON.stringify({ names: ["Jury Logo"], ok: true }),
      }),
      headers: {
        "content-type": "application/json",
        origin,
        "x-studio-relay-session": session.sessionId,
        "x-studio-relay-token": session.token,
      },
      method: "POST",
    });

    expect(submitted.status).toBe(200);
    await expect(resultPromise).resolves.toMatchObject({
      content: [{ text: '{"names":["Jury Logo"],"ok":true}', type: "text" }],
    });
  });
});

async function connectClient(): Promise<{ baseUrl: string; client: Client }> {
  const server = createMcpHttpServer();
  openServers.push(server);
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const port = (server.address() as AddressInfo).port;
  const client = new Client({ name: "img2svg-test", version: "0.1.0" });
  openClients.push(client);
  const baseUrl = `http://127.0.0.1:${port}`;
  await client.connect(new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`)));
  return { baseUrl, client };
}

async function pollCommand(
  baseUrl: string,
  origin: string,
  session: { sessionId: string; token: string },
): Promise<{ commandId: string; input: unknown; toolName: string }> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/studio-relay/commands`, {
      headers: {
        origin,
        "x-studio-relay-session": session.sessionId,
        "x-studio-relay-token": session.token,
      },
    });
    if (response.status === 200) {
      return (await response.json()) as { commandId: string; input: unknown; toolName: string };
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
  }
  throw new Error("The relay command was not queued.");
}
