import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given a displayed conversion, when downloaded, then its bytes exactly match the visible SVG", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  await page.getByRole("button", { name: "Variante übernehmen" }).click();
  await page.getByRole("button", { name: "SVG", exact: true }).click();

  const displayedSvg = page.getByTestId("svg-output").locator("svg");
  await expect(displayedSvg).toBeVisible();
  const displayedBytes = await displayedSvg.evaluate((svg) =>
    new XMLSerializer().serializeToString(svg),
  );
  const downloadStarted = page.waitForEvent("download");

  await page.getByRole("button", { name: "SVG herunterladen" }).click();

  const download = await downloadStarted;
  const downloadedPath = await download.path();
  if (!downloadedPath) {
    throw new Error("The browser did not provide the completed download path.");
  }
  expect(download.suggestedFilename()).toBe("circle.svg");
  expect(await readFile(downloadedPath, "utf8")).toBe(displayedBytes);
});

test("Given a displayed conversion, when a later worker fails, then the result remains usable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  await page.getByRole("button", { name: "Variante übernehmen" }).click();
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  await expect(page.getByTestId("svg-output").locator("svg")).toBeVisible();
  await page.route("**/*.wasm", (route) => route.abort("failed"));

  await page.getByLabel("Zielgröße").selectOption("50");

  await expect(page.getByRole("alert")).toHaveText(
    "Die lokale Konvertierung ist fehlgeschlagen. Bitte versuche es erneut.",
  );
  await expect(page.getByRole("button", { name: "Variante übernehmen" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "SVG herunterladen" })).toBeVisible();
  await expect(page.getByTestId("svg-output").locator("svg")).toBeVisible();
});
