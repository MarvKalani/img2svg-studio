import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { PredecessorToolName } from "../../integrations/img2-download/tool-capability-map";

const productionUrl = process.env.PREDECESSOR_WEBMCP_URL;
const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test.skip(
  productionUrl === undefined,
  "Requires the deployed predecessor adapter and WebMCP-enabled target Chrome.",
);

test("Given a confirmed local image in img2.download, when its WebMCP workflow runs, then every converter command stays visible and downloadable", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const response = await page.goto(`${productionUrl}/app`);
  expect(response?.headers()["origin-agent-cluster"]).toBe("?1");
  expect(response?.headers()["permissions-policy"]).toBe("tools=(self)");
  await page.locator("#file-input").setInputFiles(circleFixturePath);
  await expect(page.locator("#file-list-container")).toContainText("circle.png");

  const availableTools = await page.evaluate(async () => {
    const context = (
      document as Document & {
        modelContext?: {
          getTools(): Promise<readonly { name: string }[]>;
        };
      }
    ).modelContext;
    if (!context) {
      throw new Error("document.modelContext is unavailable.");
    }
    return (await context.getTools()).map((tool) => tool.name);
  });
  expect(availableTools.sort()).toEqual(Object.values(PredecessorToolName).sort());

  const configured = await executeTool(page, PredecessorToolName.SetConversionSettings, {
    format: "svg",
    quality: 85,
    scalePercent: 100,
  });
  expect(configured).toMatchObject({ ok: true });
  await expect(page.locator("#format-select")).toHaveValue("svg");
  await executeTool(page, PredecessorToolName.SetSvgSettings, {
    colorPrecision: 2,
    filterSpeckle: 4,
  });
  await executeTool(page, PredecessorToolName.OpenPreview, { fileIndex: 0 });
  await expect(page.locator("#preview-modal")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  const downloaded = await executeTool(page, PredecessorToolName.DownloadSingleImage, {
    fileIndex: 0,
  });
  expect(downloaded).toMatchObject({ ok: true });
  expect((await downloadPromise).suggestedFilename()).toBe("circle.svg");
});

async function executeTool(
  page: import("@playwright/test").Page,
  name: string,
  input: unknown,
): Promise<Record<string, unknown>> {
  return page.evaluate(
    async ({ input, name }) => {
      const context = (
        document as Document & {
          modelContext?: {
            executeTool(tool: unknown, input: string): Promise<string>;
            getTools(): Promise<readonly { name: string }[]>;
          };
        }
      ).modelContext;
      if (!context) {
        throw new Error("document.modelContext is unavailable.");
      }
      const tool = (await context.getTools()).find((candidate) => candidate.name === name);
      if (!tool) {
        throw new Error(`Missing WebMCP tool: ${name}`);
      }
      return JSON.parse(await context.executeTool(tool, JSON.stringify(input))) as Record<
        string,
        unknown
      >;
    },
    { input, name },
  );
}
