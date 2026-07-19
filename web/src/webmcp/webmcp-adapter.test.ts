import { describe, expect, test, vi } from "vitest";
import { initializeWebMcp, WebMcpToolName, type WebMcpTool } from "./webmcp-adapter";

describe("WebMCP adapter", () => {
  test("Given document.modelContext, when initialized, then get_capabilities is registered with a narrow read-only contract", async () => {
    const registered: WebMcpTool[] = [];
    const registerTool = vi.fn(async (tool: WebMcpTool) => {
      registered.push(tool);
    });

    const result = await initializeWebMcp({ modelContext: { registerTool } }, () => ({
      imageLoaded: true,
      version: "1",
      tools: [WebMcpToolName.GetCapabilities],
    }));

    expect(result.status).toBe("registered");
    expect(result.toolNames).toEqual([WebMcpToolName.GetCapabilities]);
    expect(registerTool).toHaveBeenCalledOnce();
    expect(registered[0]).toMatchObject({
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      inputSchema: { additionalProperties: false, properties: {}, type: "object" },
      name: WebMcpToolName.GetCapabilities,
    });
    expect(JSON.parse(await registered[0]!.execute({}))).toEqual({
      imageLoaded: true,
      tools: [WebMcpToolName.GetCapabilities],
      version: "1",
    });
  });

  test("Given no supported API, when initialized, then the adapter is a no-op", async () => {
    const result = await initializeWebMcp({}, () => ({
      imageLoaded: false,
      tools: [WebMcpToolName.GetCapabilities],
      version: "1",
    }));

    expect(result).toMatchObject({ status: "unsupported", toolNames: [] });
  });

  test("Given registration is denied, when initialized, then failure stays contained", async () => {
    const result = await initializeWebMcp(
      {
        modelContext: {
          registerTool: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
        },
      },
      () => ({ imageLoaded: false, tools: [], version: "1" }),
    );

    expect(result).toMatchObject({ status: "registration-failed", toolNames: [] });
  });
});
