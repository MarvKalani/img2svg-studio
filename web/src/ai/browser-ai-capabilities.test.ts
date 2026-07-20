import { describe, expect, test } from "vitest";
import { detectBrowserAiCapabilities } from "./browser-ai-capabilities";

describe("browser AI capabilities", () => {
  test("Given no WebGPU provider, when capabilities are detected, then GPU-only tools are unavailable", async () => {
    await expect(detectBrowserAiCapabilities({})).resolves.toEqual({
      shaderF16: false,
      smartSelect: false,
      webGpu: false,
    });
  });

  test("Given WebGPU without shader-f16, when capabilities are detected, then Smart Select is unavailable", async () => {
    await expect(
      detectBrowserAiCapabilities({
        gpu: { requestAdapter: async () => ({ features: new Set<string>() }) },
      }),
    ).resolves.toEqual({ shaderF16: false, smartSelect: false, webGpu: true });
  });

  test("Given a shader-f16 adapter, when capabilities are detected, then Smart Select is available", async () => {
    await expect(
      detectBrowserAiCapabilities({
        gpu: { requestAdapter: async () => ({ features: new Set(["shader-f16"]) }) },
      }),
    ).resolves.toEqual({ shaderF16: true, smartSelect: true, webGpu: true });
  });

  test("Given adapter detection fails, when capabilities are detected, then the app degrades safely", async () => {
    await expect(
      detectBrowserAiCapabilities({
        gpu: {
          requestAdapter: () => Promise.reject(new Error("adapter unavailable")),
        },
      }),
    ).resolves.toEqual({ shaderF16: false, smartSelect: false, webGpu: false });
  });
});
