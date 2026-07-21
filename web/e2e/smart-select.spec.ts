import { resolve } from "node:path";
import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

const portraitFixturePath = resolve(import.meta.dirname, "../../fixtures/ai/input/portrait.png");
const slimsamRevision = "5850ab45f587c112167512ffef949107115e26a0";
const pinnedArtifactPaths = new Set([
  "config.json",
  "preprocessor_config.json",
  "onnx/vision_encoder_fp16.onnx",
  "onnx/prompt_encoder_mask_decoder_fp16.onnx",
]);

test("Given loaded SlimSAM, when two positive and one negative point refine the mask, then discard preserves and apply creates RGBA", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const remoteRequests = collectRemoteModelRequests(page);
  await page.goto("/");
  test.skip(
    await page.getByRole("button", { name: "Smart Select", exact: true }).isHidden(),
    "SlimSAM requires a real WebGPU adapter with shader-f16.",
  );
  await page.evaluate(async () => caches.delete("transformers-cache"));
  await page.getByLabel("Rasterbild auswählen").setInputFiles(portraitFixturePath);
  await page.getByRole("button", { name: "Variante übernehmen" }).click();
  await expect(page.getByTestId("history-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Original", exact: true }).click();

  await page.getByRole("button", { name: "KI-Manager" }).click();
  const modelCard = page.locator("[data-model-id='slimsam']");
  const smartSelect = page.getByRole("button", { name: "Smart Select", exact: true });
  await expect(smartSelect).toBeDisabled();
  await modelCard.getByRole("button", { name: "Laden: SlimSAM 77 Uniform" }).click();
  await expect(modelCard).toHaveAttribute("data-model-state", "downloading");
  await expect(modelCard).toHaveAttribute("data-model-state", "ready", { timeout: 180_000 });
  await expect(smartSelect).toBeEnabled();

  const originalPreviewUrl = await page.getByTestId("workspace-raster-preview").getAttribute("src");
  await smartSelect.click();
  await expect(page.getByTestId("sam-selection-overlay")).toBeVisible({ timeout: 180_000 });
  await expect(page.getByTestId("workspace-raster-preview")).toBeVisible();
  await expect(page.getByTestId("svg-output")).toBeHidden();
  await refinePortraitMask(page);

  const selectedPixels = await visibleMaskPixels(page.getByTestId("sam-mask-canvas"));
  expect(selectedPixels).toBeGreaterThan(0);
  expect(selectedPixels).toBeLessThan(256 * 256);
  await page.locator("#sam-invert-mask").click();
  const invertedPixels = await visibleMaskPixels(page.getByTestId("sam-mask-canvas"));
  expect(selectedPixels + invertedPixels).toBe(256 * 256);

  await page.locator("#sam-discard-mask").click();
  await expect(page.getByTestId("sam-selection-overlay")).toBeHidden();
  await expect(page.locator("#smart-select-status")).toContainText("Original unverändert");
  await expect(page.getByText("portrait.png", { exact: true })).toBeVisible();
  await expect(page.getByTestId("workspace-raster-preview")).toHaveAttribute(
    "src",
    originalPreviewUrl ?? "",
  );
  await expect(page.getByTestId("history-card")).toHaveCount(1);

  await smartSelect.click();
  await expect(page.getByTestId("sam-selection-overlay")).toBeVisible({ timeout: 180_000 });
  await refinePortraitMask(page);
  await page.locator("#sam-apply-mask").click();

  await expect(page.getByText("portrait-smart-select.png", { exact: true })).toBeVisible({
    timeout: 180_000,
  });
  await expect(page.locator("#smart-select-status")).toContainText("lokal angewendet");
  await expect(page.getByTestId("history-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Verarbeitet", exact: true }).click();
  const alpha = await previewAlpha(page);
  expect(alpha.background).toBeLessThan(64);
  expect(alpha.foreground).toBeGreaterThan(192);
  expect(alpha.minimum).toBeLessThan(alpha.maximum);

  expect(remoteRequests.length).toBeGreaterThan(0);
  expect(
    remoteRequests
      .filter((request) => !isPinnedSlimsamArtifactRequest(request))
      .map((request) => request.url()),
  ).toEqual([]);
});

async function refinePortraitMask(page: Page): Promise<void> {
  const canvas = page.getByTestId("sam-mask-canvas");
  await clickImagePoint(canvas, 128, 175);
  await expect(page.locator("#smart-select-status")).toContainText(
    "Maske mit 1 Punkt aktualisiert",
    {
      timeout: 180_000,
    },
  );
  await clickImagePoint(canvas, 128, 72);
  await expect(page.locator("#smart-select-status")).toContainText(
    "Maske mit 2 Punkten aktualisiert",
    { timeout: 180_000 },
  );
  await page.locator("#sam-negative-point").click();
  await clickImagePoint(canvas, 8, 8);
  await expect(page.locator("#smart-select-status")).toContainText(
    "Maske mit 3 Punkten aktualisiert",
    { timeout: 180_000 },
  );
  await expect(page.locator(".sam-point[data-point-kind='positive']")).toHaveCount(2);
  await expect(page.locator(".sam-point[data-point-kind='negative']")).toHaveCount(1);
  await expect(page.locator("#sam-apply-mask")).toBeEnabled();
}

async function clickImagePoint(canvas: Locator, xPixels: number, yPixels: number): Promise<void> {
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Smart-Select canvas is not visible.");
  }
  await canvas.click({
    position: {
      x: (xPixels / 256) * bounds.width,
      y: (yPixels / 256) * bounds.height,
    },
  });
}

async function visibleMaskPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Mask canvas is unavailable.");
    }
    const rgba = context.getImageData(0, 0, element.width, element.height).data;
    let visible = 0;
    for (let alphaIndex = 3; alphaIndex < rgba.length; alphaIndex += 4) {
      visible += (rgba[alphaIndex] ?? 0) > 0 ? 1 : 0;
    }
    return visible;
  });
}

async function previewAlpha(
  page: Page,
): Promise<Readonly<{ background: number; foreground: number; maximum: number; minimum: number }>> {
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
    let maximum = 0;
    let minimum = 255;
    for (let alphaIndex = 3; alphaIndex < rgba.length; alphaIndex += 4) {
      maximum = Math.max(maximum, rgba[alphaIndex] ?? 0);
      minimum = Math.min(minimum, rgba[alphaIndex] ?? 255);
    }
    const alphaAt = (x: number, y: number): number => rgba[(y * canvas.width + x) * 4 + 3] ?? 0;
    return {
      background: alphaAt(8, 8),
      foreground: alphaAt(128, 190),
      maximum,
      minimum,
    };
  });
}

function collectRemoteModelRequests(page: Page): Request[] {
  const requests: Request[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== "http://127.0.0.1:4173" &&
      ["fetch", "xhr"].includes(request.resourceType())
    ) {
      requests.push(request);
    }
  });
  return requests;
}

function isPinnedSlimsamArtifactRequest(request: Request): boolean {
  let requestInRedirectChain: Request | null = request;
  while (requestInRedirectChain) {
    const url = new URL(requestInRedirectChain.url());
    const prefix = `/Xenova/slimsam-77-uniform/resolve/${slimsamRevision}/`;
    if (url.origin === "https://huggingface.co" && url.pathname.startsWith(prefix)) {
      return pinnedArtifactPaths.has(decodeURIComponent(url.pathname.slice(prefix.length)));
    }
    requestInRedirectChain = requestInRedirectChain.redirectedFrom();
  }
  return false;
}
