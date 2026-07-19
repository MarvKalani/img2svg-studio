import { expect, test } from "@playwright/test";

test("Given the model manager, when no download was requested, then both local AI models are described without model traffic", async ({
  page,
}) => {
  const unexpectedRequests: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173/")) {
      unexpectedRequests.push(request.url());
    }
  });
  await page.goto("/");

  await expect(page.getByRole("list", { name: "KI-Modelle" }).getByRole("listitem")).toHaveCount(2);
  const card = page.locator('[data-model-id="slimsam"]');
  await expect(card).toContainText("Smart Select");
  await expect(card).toContainText("19,76 MiB · Apache-2.0");
  await expect(card.locator(".model-status")).toHaveText("Nicht geladen");
  await expect(card.getByRole("button", { name: "Laden: SlimSAM 77 Uniform" })).toBeEnabled();
  await expect(page.locator('[data-model-id="modnet"]')).toContainText("MODNet Portrait Matting");
  await expect(unexpectedRequests).toEqual([]);
});
