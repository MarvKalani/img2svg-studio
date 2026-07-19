import { resolve } from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";

const portraitFixturePath = resolve(import.meta.dirname, "../../fixtures/ai/input/portrait.png");
const modnetRevision = "fa2fa546052fba4c08921230a26cc69a333fca12";
const pinnedArtifactPaths = new Set(["config.json", "preprocessor_config.json", "onnx/model.onnx"]);

test("Given a local portrait and unloaded MODNet, when background removal runs, then RGBA is produced locally with the real backend", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const remoteRequests = collectRemoteModelRequests(page);
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(portraitFixturePath);
  expect(remoteRequests).toEqual([]);

  const modnetCard = page.locator("[data-model-id='modnet']");
  await page.getByRole("button", { name: "Hintergrund entfernen", exact: true }).click();

  await expect(modnetCard).toHaveAttribute("data-model-state", "downloading");
  await expect(modnetCard.getByRole("progressbar")).toBeVisible();
  await expect(page.locator("#background-removal-status")).toContainText(
    "Hintergrund lokal entfernt",
    { timeout: 180_000 },
  );
  await expect(modnetCard).toHaveAttribute("data-model-state", "ready");
  await expect(modnetCard.locator(".model-status")).toHaveText(/Bereit · (WebGPU|WASM)/u);
  await expect(page.getByText("portrait-freigestellt.png", { exact: true })).toBeVisible();

  const alphaResult = await previewAlphaResult(page);
  expect(alphaResult.background).toBeLessThan(64);
  expect(alphaResult.foreground).toBeGreaterThan(192);
  expect(alphaResult.minimum).toBeLessThan(alphaResult.maximum);
  expect(remoteRequests.length).toBeGreaterThan(0);
  expect(
    remoteRequests
      .filter((request) => !isPinnedModnetArtifactRequest(request))
      .map((request) => request.url()),
  ).toEqual([]);
});

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

function isPinnedModnetArtifactRequest(request: Request): boolean {
  let requestInRedirectChain: Request | null = request;
  while (requestInRedirectChain) {
    const url = new URL(requestInRedirectChain.url());
    const prefix = `/Xenova/modnet/resolve/${modnetRevision}/`;
    if (url.origin === "https://huggingface.co" && url.pathname.startsWith(prefix)) {
      return pinnedArtifactPaths.has(decodeURIComponent(url.pathname.slice(prefix.length)));
    }
    requestInRedirectChain = requestInRedirectChain.redirectedFrom();
  }
  return false;
}

async function previewAlphaResult(
  page: Page,
): Promise<Readonly<{ background: number; foreground: number; maximum: number; minimum: number }>> {
  return page.getByTestId("workspace-raster-preview").evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Test canvas is unavailable.");
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
