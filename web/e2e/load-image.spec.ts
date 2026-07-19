import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);
const brokenFixturePath = resolve(import.meta.dirname, "../../fixtures/image-loading/broken.png");

test("Given a 256 by 256 PNG, when selected, then the same local image and dimensions are visible", async ({
  page,
}) => {
  const imageUploadRequests = collectImageUploadRequests(page);
  await page.goto("/");

  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  await expect(page.getByText("circle.png", { exact: true })).toBeVisible();
  await expect(
    page.getByTestId("image-dropzone").getByText("256 × 256 · PNG", { exact: true }),
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
    page.getByTestId("image-dropzone").getByText("256 × 256 · PNG", { exact: true }),
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
