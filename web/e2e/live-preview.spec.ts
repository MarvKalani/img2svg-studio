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

  await page.getByLabel("Zielgröße").selectOption("50");

  await expect(preview).toHaveAttribute("viewBox", "0 0 128 128");
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

  await page.locator("#view-original").click();
  await expect(page.getByRole("button", { name: "Zauberstab" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Hintergrund entfernen" })).toBeEnabled();

  await page.locator("#view-svg").click();
  await expect(page.getByRole("button", { name: "Zauberstab" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hintergrund entfernen" })).toBeDisabled();
});
