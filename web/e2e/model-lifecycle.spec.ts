import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const portraitFixturePath = resolve(import.meta.dirname, "../../fixtures/ai/input/portrait.png");

test("Given an active model download, when cancelled and retried, then every operation reaches a usable end state", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await page.evaluate(async () => caches.delete("transformers-cache"));
  const card = page.locator("[data-model-id='slimsam']");

  await card.getByRole("button", { name: "Laden: SlimSAM 77 Uniform" }).click();
  await expect(card).toHaveAttribute("data-model-state", "downloading");
  await card.getByRole("button", { name: "Abbrechen: SlimSAM 77 Uniform" }).press("Enter");
  await expect(card).toHaveAttribute("data-model-state", "not-loaded");

  await page.route("https://huggingface.co/**", (route) => route.abort("internetdisconnected"));
  await card.getByRole("button", { name: "Laden: SlimSAM 77 Uniform" }).click();
  await expect(card).toHaveAttribute("data-model-state", "error", { timeout: 180_000 });
  await page.unroute("https://huggingface.co/**");
  await card.getByRole("button", { name: "Erneut versuchen: SlimSAM 77 Uniform" }).press("Enter");
  await expect(card).toHaveAttribute("data-model-state", "ready", { timeout: 180_000 });
  await card.getByRole("button", { name: "Entladen: SlimSAM 77 Uniform" }).press("Enter");
  await expect(card).toHaveAttribute("data-model-state", "not-loaded");
});

test("Given an offline MODNet load, when connectivity returns, then retry runs inference and unload waits for it", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/");
  await page.evaluate(async () => caches.delete("transformers-cache"));
  await page.getByLabel("Rasterbild auswählen").setInputFiles(portraitFixturePath);
  await page.route("https://huggingface.co/**", (route) => route.abort("internetdisconnected"));

  const card = page.locator("[data-model-id='modnet']");
  await page.getByRole("button", { name: "Hintergrund entfernen", exact: true }).click();
  await expect(card).toHaveAttribute("data-model-state", "error");
  await expect(card.getByRole("alert")).toContainText("Prüfe die Netzwerkverbindung");

  await page.unroute("https://huggingface.co/**");
  await card
    .getByRole("button", { name: "Erneut versuchen: MODNet Portrait Matting" })
    .press("Enter");
  await expect(card).toHaveAttribute("data-model-state", "ready", { timeout: 180_000 });

  await page.getByRole("button", { name: "Hintergrund entfernen", exact: true }).click();
  await expect(page.locator("#background-removal-status")).toContainText(
    "Hintergrund wird lokal entfernt",
  );
  await card.getByRole("button", { name: "Entladen: MODNet Portrait Matting" }).press("Enter");

  await expect(page.getByText("portrait-freigestellt.png", { exact: true })).toBeVisible({
    timeout: 180_000,
  });
  await expect(card).toHaveAttribute("data-model-state", "not-loaded");
});
