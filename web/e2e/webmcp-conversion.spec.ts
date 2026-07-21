import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given a loaded image and WebMCP, when an agent configures and converts, then the visible UI and History use the same services", async ({
  page,
}) => {
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
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-webmcp", "registered");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  const configured = await executeTool(page, "configure_conversion", {
    colorPrecision: 5,
    filterSpeckle: 12,
    pathPrecision: 2,
    rasterSharpenStrength: 35,
    rasterSmoothStrength: 70,
    scalePercent: 50,
  });
  expect(configured).toMatchObject({ ok: true });
  await expect(page.getByRole("slider", { name: "Farbpräzision", exact: true })).toHaveValue("5");
  await expect(page.getByRole("slider", { name: "Speckle-Filter", exact: true })).toHaveValue("12");
  await expect(page.getByLabel("Zielgröße")).toHaveValue("50");
  await expect(page.getByLabel("Glättungsstärke")).toHaveValue("70");
  await expect(page.getByLabel("Schärfungsstärke")).toHaveValue("35");
  await expect(page.getByLabel("Zielmaße")).toHaveText("128 × 128 px");

  const converted = await executeTool(page, "convert_current_image", {});
  expect(converted).toMatchObject({
    fileName: "circle.png",
    heightPixels: 128,
    ok: true,
    runId: 1,
    sizeBytes: expect.any(Number),
    widthPixels: 128,
  });
  await expect(page.getByTestId("svg-output").locator("svg")).toHaveAttribute(
    "viewBox",
    "0 0 128 128",
  );
  await expect(page.locator('[data-run-id="1"]')).toContainText("128 × 128");

  await executeTool(page, "configure_conversion", {
    colorPrecision: 7,
    filterSpeckle: 4,
    pathPrecision: 2,
    scalePercent: 100,
  });
  await executeTool(page, "convert_current_image", {});
  await executeTool(page, "select_comparison_a", { original: true });
  await executeTool(page, "select_comparison_b", { runId: 2 });
  await expect(page.locator("#compare-label-a")).toHaveText("A · Original");
  await expect(page.locator("#compare-label-b")).toHaveText("B · Run 2");
  expect(await executeTool(page, "get_workspace_state", {})).toMatchObject({
    comparison: { a: "original", b: 2 },
  });

  await executeTool(page, "select_comparison_a", { runId: 1 });
  await expect(page.locator("#compare-output")).toBeVisible();
  await expect(page.locator("#compare-label-a")).toHaveText("A · Run 1");
  await expect(page.locator("#compare-label-b")).toHaveText("B · Run 2");

  const workspace = await executeTool(page, "get_workspace_state", {});
  expect(workspace).toMatchObject({
    comparison: { a: 1, b: 2 },
    history: [{ id: 2 }, { id: 1 }],
    image: { fileName: "circle.png", loaded: true, sizeBytes: 3420 },
  });
  await executeTool(page, "select_history_run", { runId: 1 });
  await expect(page.locator("#compare-output")).toBeHidden();
  const downloadPromise = page.waitForEvent("download");
  const downloadResult = await executeTool(page, "download_selected_svg", {});
  expect(downloadResult).toEqual({ downloaded: true, ok: true });
  expect((await downloadPromise).suggestedFilename()).toBe("circle.svg");

  expect(await executeTool(page, "delete_history_run", { runId: 1 })).toEqual({
    deletedRunId: 1,
    ok: true,
  });
  await expect(page.locator('[data-run-id="1"]')).toHaveCount(0);
  await expect(page.getByTestId("workspace-raster-preview")).toBeVisible();

  const unloadResult = await executeTool(page, "unload_model", { modelId: "modnet" });
  expect(unloadResult).toMatchObject({ model: { id: "modnet", status: "not-loaded" }, ok: true });

  await executeTool(page, "configure_conversion", {
    colorPrecision: 7,
    filterSpeckle: 4,
    pathPrecision: 2,
    rasterFilterMode: "grayscale",
    rasterResizePercent: 200,
    scalePercent: 100,
  });
  await expect(page.getByLabel("Rastergröße vor Tracing")).toHaveValue("percent-200");
  await expect(page.getByLabel("Rasterfilter")).toHaveValue("grayscale");
  await expect(page.getByLabel("Vorbereitete Rastermaße")).toHaveText("512 × 512 px");

  const capabilities = await executeTool(page, "get_capabilities", {});
  expect(capabilities).toEqual({
    imageLoaded: true,
    tools: [
      "get_capabilities",
      "configure_conversion",
      "convert_current_image",
      "cancel_conversion",
      "get_workspace_state",
      "select_history_run",
      "delete_history_run",
      "select_comparison_a",
      "select_comparison_b",
      "download_selected_svg",
      "load_model",
      "retry_model",
      "unload_model",
      "apply_background_removal",
      "apply_smart_selection",
    ],
    version: "1",
  });
});

async function executeTool(
  page: import("@playwright/test").Page,
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
