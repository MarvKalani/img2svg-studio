import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given an image is loaded, when the live preview completes, then original A and the unsaved draft B are compared", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  const acceptButton = page.locator("#convert-button");
  const preview = page.getByTestId("svg-output").locator("svg");
  await expect(preview).toHaveAttribute("viewBox", "0 0 256 256");
  await expect(page.locator("#view-comparison")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#compare-label-a")).toHaveText("A · Original");
  await expect(page.locator("#compare-label-b")).toHaveText("B · Entwurf");
  await expect(page.getByTestId("history-draft-card")).toBeVisible();
  await expect(page.getByTestId("history-card")).toHaveCount(0);
  await expect(page.getByLabel("Anwendungsstatus")).toContainText("0 Varianten · 1 Entwurf");
  await expect(page.getByRole("button", { name: "Zauberstab" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hintergrund entfernen" })).toBeDisabled();
  await expect(acceptButton).toBeEnabled();
  await expect(acceptButton).toContainText("Variante übernehmen");

  const layerA = page.getByTestId("compare-content-a");
  const layerB = page.getByTestId("compare-content-b");
  const canvas = page.getByTestId("compare-canvas");
  await page.getByRole("button", { name: "Vergrößern" }).click();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds) {
    await page.mouse.move(bounds.x + bounds.width / 3, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 3 + 24, bounds.y + bounds.height / 2 + 16);
    await page.mouse.up();
  }
  await page.locator("#compare-slider").fill("37");
  const preservedTransform = await layerA.getAttribute("style");
  expect(preservedTransform).toContain("translate(24px, 16px) scale(1.25)");

  await page.getByLabel("Zielgröße").selectOption("50");

  await expect(preview).toHaveAttribute("viewBox", "0 0 128 128");
  await expect(layerA).toHaveAttribute("style", preservedTransform ?? "");
  await expect(layerB).toHaveAttribute("style", preservedTransform ?? "");
  await expect(page.locator("#compare-slider")).toHaveValue("37");
  await expect(page.getByTestId("zoom-value")).toHaveText("125%");
  await expect(page.locator("#compare-label-b")).toHaveText("B · Entwurf");
  await expect(page.getByTestId("history-draft-card")).toContainText("128 × 128");
  await expect(page.getByTestId("history-card")).toHaveCount(0);
  await expect(acceptButton).toBeEnabled();

  await acceptButton.click();

  await expect(page.getByTestId("history-draft-card")).toHaveCount(0);
  await expect(page.getByTestId("history-card")).toHaveCount(1);
  await expect(page.getByTestId("history-card")).toContainText("128 × 128");
  await expect(page.locator("#compare-label-a")).toHaveText("A · Original");
  await expect(page.locator("#compare-label-b")).toHaveText("B · Run 1");
  await expect(acceptButton).toBeDisabled();
  await expect(acceptButton).toContainText("Im Verlauf gespeichert");

  await page.getByRole("button", { name: "Vergrößern" }).click();
  await page.locator("#compare-slider").fill("42");
  await page.getByLabel("Zielgröße").selectOption("75");
  await expect(page.locator("#compare-label-b")).toHaveText("B · Entwurf");
  await expect(page.getByTestId("zoom-value")).toHaveText("125%");
  await expect(page.locator("#compare-slider")).toHaveValue("42");

  await page.locator("#view-original").click();
  await expect(page.getByRole("button", { name: "Zauberstab" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Hintergrund entfernen" })).toBeEnabled();

  await page.locator("#view-svg").click();
  await expect(page.getByRole("button", { name: "Zauberstab" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hintergrund entfernen" })).toBeDisabled();
});
