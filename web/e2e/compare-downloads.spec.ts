import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given A and B differ only in color precision, when filtered and downloaded, then one row and exact run bytes remain", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  const convertButton = page.getByRole("button", { name: "Variante übernehmen" });
  await convertButton.click();
  const svgA = await serializedOutput(page);

  await page.getByRole("slider", { name: "Farbpräzision", exact: true }).fill("5");
  await convertButton.click();
  const svgB = await serializedOutput(page);
  await page.getByRole("button", { name: "Run 1 als A setzen" }).click();
  await page.getByRole("button", { name: "Run 2 als B setzen" }).click();

  const onlyDifferences = page.getByRole("checkbox", { name: "Nur Unterschiede" });
  const rows = page.getByTestId("diff-setting-row");
  await expect(onlyDifferences).toBeChecked();
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByRole("cell")).toHaveText(["Farbpräzision", "6 Bit", "5 Bit"]);
  await onlyDifferences.uncheck();
  await expect(rows).toHaveCount(22);
  await onlyDifferences.check();

  await expectDownload(page, "SVG A", "circle-a-run-1.svg", svgA);
  await expectDownload(page, "SVG B", "circle-b-run-2.svg", svgB);
});

async function serializedOutput(page: import("@playwright/test").Page): Promise<string> {
  return page
    .getByTestId("svg-output")
    .locator("svg")
    .evaluate((svg) => new XMLSerializer().serializeToString(svg));
}

async function expectDownload(
  page: import("@playwright/test").Page,
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
