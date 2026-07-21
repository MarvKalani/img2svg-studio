import { describe, expect, test, vi } from "vitest";

import { createStudioRelayClient } from "./studio-relay-client";
import type { WebMcpTool } from "./webmcp-adapter";

describe("Studio relay client", () => {
  test("Given a connected Companion command, when synchronized, then the matching visible Studio tool returns its result", async () => {
    const execute = vi.fn(() => JSON.stringify({ ok: true, presets: [{ name: "Jury Logo" }] }));
    const fetchRelay = vi
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ sessionId: "session-1", token: "secret" }, 201))
      .mockResolvedValueOnce(
        jsonResponse({ commandId: "command-1", input: {}, toolName: "list_conversion_presets" }),
      )
      .mockResolvedValueOnce(jsonResponse({ accepted: true, ok: true }));
    const client = createStudioRelayClient([tool("list_conversion_presets", execute)], {
      fetch: fetchRelay,
    });

    await client.connect();
    await expect(client.synchronize()).resolves.toBe(true);

    expect(execute).toHaveBeenCalledWith({});
    expect(fetchRelay).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8787/studio-relay/results",
      expect.objectContaining({
        body: '{"commandId":"command-1","result":"{\\"ok\\":true,\\"presets\\":[{\\"name\\":\\"Jury Logo\\"}]}"}',
        method: "POST",
        targetAddressSpace: "loopback",
      }),
    );
  });

  test("Given an unexposed command, when synchronized, then the browser refuses it without executing another tool", async () => {
    const fetchRelay = vi
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ sessionId: "session-1", token: "secret" }, 201))
      .mockResolvedValueOnce(
        jsonResponse({ commandId: "command-1", input: {}, toolName: "delete_everything" }),
      )
      .mockResolvedValueOnce(jsonResponse({ accepted: true, ok: true }));
    const client = createStudioRelayClient([], { fetch: fetchRelay });

    await client.connect();
    await client.synchronize();

    expect(fetchRelay).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({ body: expect.stringContaining("unsupported_tool") }),
    );
  });
});

function tool(name: string, execute: WebMcpTool["execute"]): WebMcpTool {
  return {
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    description: name,
    execute,
    inputSchema: {},
    name,
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status,
  });
}
