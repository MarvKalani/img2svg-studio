import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const portraitFixturePath = resolve(import.meta.dirname, "../../fixtures/ai/input/portrait.png");

test("Given SlimSAM and a local image, when the WebMCP agent applies normalized points, then the visible versioned result is produced", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await installWebMcpFake(page);
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(portraitFixturePath);

  const loaded = await executeTool(page, "load_model", { modelId: "slimsam" });
  expect(loaded).toMatchObject({ model: { id: "slimsam", status: "ready" }, ok: true });
  await expect(page.locator('[data-model-id="slimsam"]')).toHaveAttribute(
    "data-model-state",
    "ready",
  );

  const applied = await executeTool(page, "apply_smart_selection", {
    negativePoints: [{ x: 8 / 255, y: 8 / 255 }],
    polarity: "selected",
    positivePoints: [
      { x: 128 / 255, y: 175 / 255 },
      { x: 128 / 255, y: 72 / 255 },
    ],
  });
  expect(applied).toEqual({ fileName: "portrait-smart-select.png", ok: true });
  await expect(page.getByText("portrait-smart-select.png", { exact: true })).toBeVisible();
  await expect(page.locator("#source-metadata")).toContainText("KI-Ergebnis · V2");
  await expect(page.getByTestId("sam-selection-overlay")).toBeHidden();
  const alpha = await previewAlpha(page);
  expect(alpha.background).toBeLessThan(64);
  expect(alpha.foreground).toBeGreaterThan(192);

  const unloaded = await executeTool(page, "unload_model", { modelId: "slimsam" });
  expect(unloaded).toMatchObject({ model: { id: "slimsam", status: "not-loaded" }, ok: true });
});

async function installWebMcpFake(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tools = new Map<
      string,
      { execute(input: unknown): Promise<string> | string; name: string }
    >();
    Object.defineProperty(window, "__studioWebMcpTools", { value: tools });
    Object.defineProperty(document, "modelContext", {
      value: {
        registerTool: async (tool: { name: string }) => {
          tools.set(
            tool.name,
            tool as { execute(input: unknown): Promise<string> | string; name: string },
          );
        },
      },
    });
  });
}

async function executeTool(
  page: Page,
  name: string,
  input: unknown,
): Promise<Record<string, unknown>> {
  return page.evaluate(
    async ({ input, name }) => {
      const tools = (
        window as unknown as Window & {
          __studioWebMcpTools: Map<
            string,
            { execute(input: unknown): Promise<string> | string; name: string }
          >;
        }
      ).__studioWebMcpTools;
      const tool = tools.get(name);
      if (!tool) {
        throw new Error(`Missing registered tool: ${name}`);
      }
      return JSON.parse(await tool.execute(input)) as Record<string, unknown>;
    },
    { input, name },
  );
}

async function previewAlpha(
  page: Page,
): Promise<Readonly<{ background: number; foreground: number }>> {
  return page.getByTestId("workspace-raster-preview").evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Preview canvas is unavailable.");
    }
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const alphaAt = (x: number, y: number): number => rgba[(y * canvas.width + x) * 4 + 3] ?? 0;
    return { background: alphaAt(8, 8), foreground: alphaAt(128, 190) };
  });
}
