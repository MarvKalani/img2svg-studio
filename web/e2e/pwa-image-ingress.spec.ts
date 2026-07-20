import { expect, test } from "@playwright/test";

const sharedFixture = "../fixtures/shape-recognition/input/mixed.png";

test("Given the installed-app share target, when an image is posted, then the normal workspace opens it once", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await page.evaluate(() => {
    const form = document.createElement("form");
    form.action = "/share-target";
    form.enctype = "multipart/form-data";
    form.method = "post";
    const input = document.createElement("input");
    input.id = "share-target-test-input";
    input.name = "image";
    input.type = "file";
    form.append(input);
    document.body.append(form);
  });
  await page.locator("#share-target-test-input").setInputFiles(sharedFixture);
  await page
    .locator("#share-target-test-input")
    .evaluate((input) => input.closest("form")?.submit());

  await expect(page.locator("#source-name")).toHaveText("mixed.png");
  await expect(page.locator("#convert-button")).toBeEnabled();
  await expect.poll(() => new URL(page.url()).searchParams.has("shared-image")).toBe(false);
  const remainingSharedImages = await page.evaluate(async () => {
    const cache = await caches.open("img2svg-share-bridge-v1");
    return (await cache.keys()).length;
  });
  expect(remainingSharedImages).toBe(0);
});

test("Given the app shell, then the install manifest and dogfooded icons are published", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );

  const manifestResponse = await request.get("/manifest.webmanifest");
  const iconResponse = await request.get("/icons/app-icon-512.png");
  expect(manifestResponse.ok()).toBe(true);
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toBe("image/png");
});
