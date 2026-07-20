import { expect, test, type Page } from "@playwright/test";
import { emulateGpuFeatures } from "./gpu-test-fixture";

test("Given WebGPU lacks shader-f16, when the Studio starts, then SlimSAM is not offered in UI or WebMCP", async ({
  page,
}) => {
  await emulateGpuFeatures(page, []);
  await captureWebMcpTools(page);
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Smart Select", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "KI-Manager" }).click();
  await expect(page.locator('[data-model-id="modnet"]')).toBeVisible();
  await expect(page.locator('[data-model-id="slimsam"]')).toHaveCount(0);
  await expect.poll(() => registeredTools(page)).not.toContain("apply_smart_selection");

  const modelSchema = await page.evaluate(() => {
    const tools = (
      window as unknown as Window & {
        __capturedTools: Map<string, { inputSchema: Record<string, unknown> }>;
      }
    ).__capturedTools;
    return tools.get("load_model")?.inputSchema;
  });
  expect(modelSchema).toMatchObject({ properties: { modelId: { enum: ["modnet"] } } });
});

test("Given WebGPU supports shader-f16, when the Studio starts, then SlimSAM remains available", async ({
  page,
}) => {
  await emulateGpuFeatures(page, ["shader-f16"]);
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Smart Select", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "KI-Manager" }).click();
  await expect(page.locator('[data-model-id="slimsam"]')).toBeVisible();
});

async function captureWebMcpTools(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tools = new Map<string, { inputSchema: Record<string, unknown>; name: string }>();
    Object.defineProperty(window, "__capturedTools", { value: tools });
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: async (tool: { inputSchema: Record<string, unknown>; name: string }) => {
          tools.set(tool.name, tool);
        },
      },
    });
  });
}

async function registeredTools(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => [
    ...(
      window as unknown as Window & {
        __capturedTools: Map<string, unknown>;
      }
    ).__capturedTools.keys(),
  ]);
}
