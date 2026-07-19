import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given one image, when eleven conversions run, then the ten newest immutable runs can be selected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  const convertButton = page.getByRole("button", { name: "Konvertieren" });
  const runCard = (runId: number) => page.locator(`[data-run-id="${String(runId)}"]`);

  for (let runNumber = 1; runNumber <= 10; runNumber += 1) {
    await convertButton.click();
    await expect(runCard(runNumber)).toBeVisible();
  }
  await page.getByLabel("Zielgröße").selectOption("50");
  await convertButton.click();

  const historyCards = page.getByTestId("history-card");
  await expect(historyCards).toHaveCount(10);
  await expect(runCard(1)).toHaveCount(0);
  await expect(runCard(11)).toContainText("128 × 128");
  await expect(runCard(11)).toContainText("1 Pfad");
  await expect(runCard(11)).toContainText("ms");

  await runCard(2).click();

  await expect(page.getByTestId("svg-output").locator("svg")).toHaveAttribute(
    "viewBox",
    "0 0 256 256",
  );
  await expect(page.getByLabel("Zielgröße")).toHaveValue("50");
  await expect(page.getByLabel("Anwendungsstatus")).toContainText("10 Varianten");
});
