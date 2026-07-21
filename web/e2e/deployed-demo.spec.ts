import { readdir, readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { appVersion } from "../src/release/app-version";

const buildOutputPath = resolve(import.meta.dirname, "../dist");
const cloudflarePagesMaximumAssetBytes = 25 * 1024 * 1024;

test("Given the static production build, when every asset is measured, then each fits the hosting limit", async () => {
  const oversizedAssets: string[] = [];
  for (const assetPath of await collectFilePaths(buildOutputPath)) {
    const asset = await stat(assetPath);
    if (asset.size > cloudflarePagesMaximumAssetBytes) {
      oversizedAssets.push(assetPath);
    }
  }
  expect(oversizedAssets).toEqual([]);

  const builtAssets = await collectFilePaths(resolve(buildOutputPath, "assets"));
  expect(
    builtAssets
      .map((assetPath) => basename(assetPath))
      .every((name) => name.includes(`-v${appVersion}-`)),
  ).toBe(true);
});

test("Given the published build, when the lazy conversion worker is requested, then JavaScript is served instead of the SPA fallback", async ({
  request,
}) => {
  const builtAssets = await collectFilePaths(resolve(buildOutputPath, "assets"));
  const workerPath = builtAssets.find((assetPath) =>
    basename(assetPath).startsWith("conversion-worker-"),
  );
  expect(workerPath).toBeDefined();

  const response = await request.get(`/assets/${basename(workerPath ?? "")}`);

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toMatch(/^(?:application|text)\/javascript/);
  expect(await response.text()).not.toContain("<!doctype html");
});

test("Given a fresh public demo, when the example is converted, compared, and exported, then the complete workflow survives a direct visit and reload", async ({
  page,
}) => {
  const javascriptErrors: Error[] = [];
  const crossOriginRequests: string[] = [];
  page.on("pageerror", (error) => javascriptErrors.push(error));
  page.on("request", (request) => {
    if (!isSameOriginOrBlob(request.url(), page.url())) {
      crossOriginRequests.push(request.url());
    }
  });

  const response = await page.goto("/workspace");
  expect(response).not.toBeNull();
  expect(response?.headers()["origin-agent-cluster"]).toBe("?1");
  expect(response?.headers()["permissions-policy"]).toBe("tools=(self)");
  await expect(page.getByRole("banner")).toContainText("img2svg Studio");

  await page.getByRole("button", { name: "Logo-Demo laden" }).click();
  await expect(page.getByText("marv-kalani-logo.jpg", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Vorbereitete Rastermaße")).toHaveText("1280 × 876 px");
  const convertButton = page.getByRole("button", { name: "Variante übernehmen" });
  await convertButton.click();
  await expect(page.getByTestId("svg-output").locator("path")).toHaveCount(542);
  await expect(page.getByTestId("history-card")).toContainText("542 Pfade");

  await page.getByRole("slider", { name: "Farbpräzision", exact: true }).fill("5");
  await page.getByLabel("Rastergröße vor Tracing").selectOption("height-720");
  await convertButton.click();
  await expect(page.getByTestId("history-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Run 1 als A setzen" }).click();
  await page.getByRole("button", { name: "Run 2 als B setzen" }).click();
  await expect(page.getByTestId("diff-setting-row")).toHaveCount(2);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG B", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("marv-kalani-logo-b-run-2.svg");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath ?? "", "utf8")).toContain("<svg");

  await page.reload();
  await expect(page.getByRole("banner")).toContainText("img2svg Studio");
  expect(javascriptErrors).toEqual([]);
  expect(crossOriginRequests).toEqual([]);
});

function isSameOriginOrBlob(requestUrl: string, currentPageUrl: string): boolean {
  if (currentPageUrl === "about:blank") {
    return true;
  }
  const pageOrigin = new URL(currentPageUrl).origin;
  return requestUrl.startsWith(`${pageOrigin}/`) || requestUrl.startsWith(`blob:${pageOrigin}/`);
}

async function collectFilePaths(directory: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    paths.push(...(entry.isDirectory() ? await collectFilePaths(entryPath) : [entryPath]));
  }
  return paths;
}
