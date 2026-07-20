import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given an image is loaded, when parameters change, then the preview updates and only acceptance creates history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  const acceptButton = page.locator("#convert-button");
  const preview = page.getByTestId("svg-output").locator("svg");
  await expect(preview).toHaveAttribute("viewBox", "0 0 256 256");
  await expect(page.getByTestId("history-card")).toHaveCount(0);
  await expect(acceptButton).toBeEnabled();
  await expect(acceptButton).toContainText("Variante übernehmen");

  await page.getByLabel("Zielgröße").selectOption("50");

  await expect(preview).toHaveAttribute("viewBox", "0 0 128 128");
  await expect(page.getByTestId("history-card")).toHaveCount(0);
  await expect(acceptButton).toBeEnabled();

  await acceptButton.click();

  await expect(page.getByTestId("history-card")).toHaveCount(1);
  await expect(page.getByTestId("history-card")).toContainText("128 × 128");
  await expect(acceptButton).toBeDisabled();
  await expect(acceptButton).toContainText("Im Verlauf gespeichert");
});
