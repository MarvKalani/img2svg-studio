import { expect, test } from "@playwright/test";

test("Given an unloaded demo model, when load fails, retries, and unloads, then every manager state is visible without model traffic", async ({
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

  await card.getByRole("button", { name: "Laden: SlimSAM 77 Uniform" }).click();
  await expect(card).toHaveAttribute("data-model-state", "downloading");
  await expect(card.getByRole("progressbar")).toBeVisible();
  await expect(card).toHaveAttribute("data-model-state", "error");
  await expect(card.getByRole("alert")).toHaveText(
    "Simulierter erster Ladeversuch fehlgeschlagen.",
  );

  await card.getByRole("button", { name: "Erneut versuchen: SlimSAM 77 Uniform" }).press("Enter");
  await expect(card).toHaveAttribute("data-model-state", "initializing");
  await expect(card).toHaveAttribute("data-model-state", "ready");
  await expect(card.locator(".model-status")).toHaveText("Bereit · WebGPU");

  await card.getByRole("button", { name: "Entladen: SlimSAM 77 Uniform" }).press("Enter");
  await expect(card).toHaveAttribute("data-model-state", "not-loaded");
  await expect(unexpectedRequests).toEqual([]);
});
