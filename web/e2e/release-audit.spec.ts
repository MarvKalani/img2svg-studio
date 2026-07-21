import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);
const brokenFixturePath = resolve(import.meta.dirname, "../../fixtures/image-loading/broken.png");
const portraitFixturePath = resolve(import.meta.dirname, "../../fixtures/ai/input/portrait.png");
const modnetRevision = "fa2fa546052fba4c08921230a26cc69a333fca12";
const pinnedModnetArtifacts = new Set([
  "config.json",
  "preprocessor_config.json",
  "onnx/model.onnx",
]);

test("Given the complete core workflow, when operated by keyboard, then focus, visible state, and critical accessibility stay valid", async ({
  page,
}) => {
  await page.goto("/");
  await expectNoAccessibilityViolations(page);
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  const convert = page.getByRole("button", { name: "Variante übernehmen" });
  await convert.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-run-id="1"]')).toBeVisible();
  const precision = page.getByRole("slider", { name: "Farbpräzision", exact: true });
  await precision.focus();
  await page.keyboard.press("ArrowLeft");
  await convert.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-run-id="2"]')).toBeVisible();

  await page.getByRole("button", { name: "Run 1 als A setzen" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Run 2 als B setzen" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#compare-output")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run 2 als B setzen" })).toBeFocused();
  await expectNoAccessibilityViolations(page);
});

test("Given damaged or oversized input, when selected, then a useful error keeps the last valid UI state controllable", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByLabel("Rasterbild auswählen");
  await input.setInputFiles(brokenFixturePath);
  await expect(page.getByRole("alert")).toHaveText(
    "Das Bild ist beschädigt oder kann nicht gelesen werden.",
  );

  await input.setInputFiles({
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
    mimeType: "image/png",
    name: "too-large.png",
  });
  await expect(page.getByRole("alert")).toHaveText(
    "Das Bild ist größer als 25 MB. Bitte wähle eine kleinere Datei.",
  );
  await expect(page.getByRole("button", { name: "Bild wählen" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Variante übernehmen" })).toBeDisabled();
});

test("Given local conversion and an explicit model action, when network traffic is audited, then only pinned model artifacts leave the app origin", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const remoteRequests: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173") {
      remoteRequests.push(request);
    }
  });
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(portraitFixturePath);
  await page.getByRole("button", { name: "Variante übernehmen" }).click();
  expect(remoteRequests).toEqual([]);

  await page.getByRole("button", { name: "Original", exact: true }).click();
  await page.getByRole("button", { name: "Hintergrund entfernen", exact: true }).click();
  await expect(page.locator("#background-removal-status")).toContainText(
    "Hintergrund lokal entfernt",
    { timeout: 180_000 },
  );
  expect(remoteRequests.length).toBeGreaterThan(0);
  expect(remoteRequests.filter((request) => !isPinnedModnetRequest(request))).toEqual([]);
});

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
}

function isPinnedModnetRequest(request: Request): boolean {
  let current: Request | null = request;
  while (current) {
    const url = new URL(current.url());
    const prefix = `/Xenova/modnet/resolve/${modnetRevision}/`;
    if (url.origin === "https://huggingface.co" && url.pathname.startsWith(prefix)) {
      return pinnedModnetArtifacts.has(decodeURIComponent(url.pathname.slice(prefix.length)));
    }
    current = current.redirectedFrom();
  }
  return false;
}
