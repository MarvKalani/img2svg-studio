import { expect, test, type Page } from "@playwright/test";

test("Given the logo demo, when an agent previews and confirms the black edge region, then the visible Magic Wand removes only that background", async ({
  page,
}) => {
  await installWebMcpFake(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Logo-Demo laden" }).click();

  const preview = await executeTool(page, "preview_magic_wand_selection", {
    sensitivityPercent: 15,
    source: "original",
    x: 0.01,
    y: 0.01,
  });

  expect(preview).toMatchObject({
    ok: true,
    sensitivityPercent: 15,
    source: "original",
    selectedPixelCount: expect.any(Number),
  });
  expect(Number(preview.selectedPixelCount)).toBeGreaterThan(0);
  expect(Number(preview.selectedPixelCount)).toBeLessThan(1280 * 876);
  await expect(page.getByTestId("magic-wand-overlay")).toBeVisible();
  await expect(page.locator("#magic-wand-status")).toContainText("15 %");

  const applied = await executeTool(page, "apply_magic_wand_selection", {});

  expect(applied).toMatchObject({
    fileName: "marv-kalani-logo-zauberstab.png",
    ok: true,
    selectedPixelCount: preview.selectedPixelCount,
  });
  await expect(page.getByTestId("magic-wand-overlay")).toBeHidden();
  await expect(page.getByText("marv-kalani-logo-zauberstab.png", { exact: true })).toBeVisible();
  await expect(page.locator("#source-metadata")).toContainText("Bearbeitet · V2");

  await page.getByRole("button", { name: "Verarbeitet", exact: true }).click();
  const alpha = await previewAlpha(page);
  expect(alpha.background).toBe(0);
  expect(alpha.foreground).toBe(255);
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
    return { background: alphaAt(8, 8), foreground: alphaAt(640, 438) };
  });
}
