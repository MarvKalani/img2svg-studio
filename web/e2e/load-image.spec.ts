import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);
const brokenFixturePath = resolve(import.meta.dirname, "../../fixtures/image-loading/broken.png");

test("Given a fresh Studio, when the bundled logo demo is chosen, then it keeps original raster size and applies the logo preset", async ({
  page,
}) => {
  const crossOriginRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== "http://127.0.0.1:4173") {
      crossOriginRequests.push(request.url());
    }
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Logo-Demo laden" }).click();

  await expect(page.getByText("marv-kalani-logo.jpg", { exact: true })).toBeVisible();
  await expect(
    page
      .getByTestId("image-dropzone")
      .getByText("1280 × 876 · JPEG · Original · V1", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Rastergröße vor Tracing")).toHaveValue("original");
  await expect(page.getByLabel("Vorbereitete Rastermaße")).toHaveText("1280 × 876 px");
  await expect(page.getByLabel("Preset")).toHaveValue("logo");
  await expect(page.getByLabel("Farbpräzision Wert")).toHaveText("6 Bit");
  await expect(page.getByRole("switch", { name: "Native Formen aktivieren" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("checkbox", { name: "Polygon erkennen" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Kreis erkennen" })).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Variante übernehmen" })).toBeEnabled();
  expect(crossOriginRequests).toEqual([]);
});

test("Given the bundled topography raster, when its demo is chosen, then it loads locally with the measured contour profile", async ({
  page,
}) => {
  const crossOriginRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== "http://127.0.0.1:4173") {
      crossOriginRequests.push(request.url());
    }
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Topografie-Demo laden" }).click();

  await expect(page.getByText("topography-island.png", { exact: true })).toBeVisible();
  await expect(
    page
      .getByTestId("image-dropzone")
      .getByText("1536 × 1024 · PNG · Original · V1", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Rastergröße vor Tracing")).toHaveValue("percent-75");
  await expect(page.getByLabel("Vorbereitete Rastermaße")).toHaveText("1152 × 768 px");
  await expect(page.getByLabel("Preset")).toHaveValue("topography");
  await expect(page.getByRole("button", { name: "Variante übernehmen" })).toBeEnabled();
  expect(crossOriginRequests).toEqual([]);
});

test("Given a fresh Studio, when presets are inspected and adjusted, then useful profiles and a custom state are visible", async ({
  page,
}) => {
  await page.goto("/");

  const preset = page.getByLabel("Preset");
  await expect(preset.locator("option")).toHaveCount(6);
  await expect(preset).toHaveValue("balanced");
  await expect(page.getByLabel("Rastergröße vor Tracing")).toHaveValue("original");

  await preset.selectOption("photo");
  const colorPrecision = page.getByRole("slider", { name: "Farbpräzision" });
  await expect(colorPrecision).toHaveValue("8");
  await expect(page.getByRole("slider", { name: "Speckle-Filter" })).toHaveValue("4");
  await expect(page.getByLabel("Rastergröße vor Tracing")).toHaveValue("original");

  await colorPrecision.fill("7");
  await expect(preset).toHaveValue("custom");
});

test("Given a 256 by 256 PNG, when selected, then the same local image and dimensions are visible", async ({
  page,
}) => {
  const imageUploadRequests = collectImageUploadRequests(page);
  await page.goto("/");

  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  await expect(page.getByText("circle.png", { exact: true })).toBeVisible();
  await expect(
    page
      .getByTestId("image-dropzone")
      .getByText("256 × 256 · PNG · Original · V1", { exact: true }),
  ).toBeVisible();
  const workspaceImage = page.getByTestId("workspace-raster-preview");
  await expect(workspaceImage).toBeVisible();
  await expect(workspaceImage).toHaveAttribute("src", /^blob:/u);
  await expect(page.getByText("Erste Variante", { exact: true })).toBeHidden();
  expect(
    await workspaceImage.evaluate((image: HTMLImageElement) => ({
      height: image.naturalHeight,
      width: image.naturalWidth,
    })),
  ).toEqual({ height: 256, width: 256 });
  expect(imageUploadRequests).toEqual([]);
});

test("Given a 256 by 256 PNG, when dropped, then it uses the same visible loading path", async ({
  page,
}) => {
  await page.goto("/");
  const dataTransfer = await createCircleDataTransfer(page);

  await page.getByTestId("image-dropzone").dispatchEvent("drop", { dataTransfer });

  await expect(page.getByText("circle.png", { exact: true })).toBeVisible();
  await expect(
    page
      .getByTestId("image-dropzone")
      .getByText("256 × 256 · PNG · Original · V1", { exact: true }),
  ).toBeVisible();
  await dataTransfer.dispose();
});

test("Given damaged PNG bytes, when selected, then a useful error keeps the studio ready", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("Rasterbild auswählen").setInputFiles(brokenFixturePath);

  await expect(page.getByRole("alert")).toHaveText(
    "Das Bild ist beschädigt oder kann nicht gelesen werden.",
  );
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText(
    "Bereit für ein lokales Bild",
  );
});

function collectImageUploadRequests(page: Page): string[] {
  const imageUploadRequests: string[] = [];
  page.on("request", (request) => {
    if (["PATCH", "POST", "PUT"].includes(request.method())) {
      imageUploadRequests.push(request.url());
    }
  });
  return imageUploadRequests;
}

async function createCircleDataTransfer(page: Page) {
  const fixtureBase64 = (await readFile(circleFixturePath)).toString("base64");
  return page.evaluateHandle((base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([bytes], "circle.png", { type: "image/png" }));
    return dataTransfer;
  }, fixtureBase64);
}
