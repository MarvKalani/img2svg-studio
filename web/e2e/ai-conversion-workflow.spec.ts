import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const portraitFixturePath = resolve(import.meta.dirname, "../../fixtures/ai/input/portrait.png");

test("Given an applied AI mask, when original and derived inputs are converted and compared, then versions, diffs, restoration, and downloads stay consistent", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(portraitFixturePath);
  const originalPreviewUrl = await page.getByTestId("workspace-raster-preview").getAttribute("src");
  const convert = page.getByRole("button", { name: "Konvertieren" });

  await convert.click();
  const originalSvg = await serializedOutput(page);
  const run1 = page.locator('[data-run-id="1"]');
  await expect(run1).toContainText("Original · V1");

  await page.getByRole("button", { name: "Hintergrund entfernen", exact: true }).click();
  await expect(page.locator("#background-removal-status")).toContainText(
    "Hintergrund lokal entfernt",
    { timeout: 180_000 },
  );
  await expect(page.locator("#source-metadata")).toContainText("KI-Ergebnis · V2");
  await expect(page.getByRole("button", { name: "Original wiederherstellen" })).toBeVisible();

  await convert.click();
  const aiSvg = await serializedOutput(page);
  const run2 = page.locator('[data-run-id="2"]');
  await expect(run2).toContainText("KI-Ergebnis · V2");
  expect(aiSvg).not.toBe(originalSvg);

  await page.getByRole("button", { name: "Run 1 als A setzen" }).click();
  await page.getByRole("button", { name: "Run 2 als B setzen" }).click();
  const differences = page.getByTestId("diff-setting-row");
  await expect(differences).toHaveCount(1);
  await expect(differences.getByRole("cell")).toHaveText([
    "Eingabe",
    "Original · V1",
    "KI-Ergebnis · V2",
  ]);
  await expectDownload(page, "SVG A", "portrait-a-run-1.svg", originalSvg);
  await expectDownload(page, "SVG B", "portrait-freigestellt-b-run-2.svg", aiSvg);

  await run1.click();
  await expectDownload(page, "SVG herunterladen", "portrait.svg", originalSvg);
  await page.getByRole("button", { name: "Original wiederherstellen" }).click();
  await expect(page.locator("#compare-output")).toBeHidden();
  await expect(page.getByRole("button", { name: "Run 1 als A setzen" })).not.toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Run 2 als B setzen" })).not.toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("portrait.png", { exact: true })).toBeVisible();
  await expect(page.getByTestId("workspace-raster-preview")).toHaveAttribute(
    "src",
    originalPreviewUrl ?? "",
  );

  await convert.click();
  const run3 = page.locator('[data-run-id="3"]');
  await expect(run3).toContainText("Original · V1");
});

async function serializedOutput(page: Page): Promise<string> {
  return page
    .getByTestId("svg-output")
    .locator("svg")
    .evaluate((svg) => new XMLSerializer().serializeToString(svg));
}

async function expectDownload(
  page: Page,
  buttonName: string,
  fileName: string,
  expectedBytes: string,
): Promise<void> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(fileName);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath ?? "", "utf8")).toBe(expectedBytes);
}
