import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given one image, when eleven previews are accepted and unwanted runs are deleted, then the complete session stays user-controlled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  const convertButton = page.getByRole("button", { name: "Variante übernehmen" });
  const runCard = (runId: number) => page.locator(`[data-run-id="${String(runId)}"]`);
  const speckleFilter = page.getByRole("slider", { name: "Speckle-Filter", exact: true });

  for (let runNumber = 1; runNumber <= 10; runNumber += 1) {
    await speckleFilter.fill(String(runNumber - 1));
    await convertButton.click();
    await expect(runCard(runNumber)).toBeVisible();
  }
  await page.getByLabel("Zielgröße").selectOption("50");
  await convertButton.click();

  const historyCards = page.getByTestId("history-card");
  await expect(historyCards).toHaveCount(11);
  await expect(runCard(1)).toBeVisible();
  await expect(runCard(11)).toContainText("128 × 128");
  await expect(runCard(11)).toContainText("1 Pfad");
  await expect(runCard(11)).toContainText(/\d+(?: B|,\d{2} KiB)/u);
  await expect(runCard(11)).toContainText("ms");

  await page.getByRole("button", { name: "Run 1 als A setzen" }).click();
  await page.getByRole("button", { name: "Run 11 als B setzen" }).click();
  await page.getByRole("button", { name: "Run 1 löschen" }).click();

  await expect(historyCards).toHaveCount(10);
  await expect(runCard(1)).toHaveCount(0);
  await expect(page.locator("#compare-output")).toBeHidden();

  await page.getByRole("button", { name: "Run 11 löschen" }).click();

  await expect(historyCards).toHaveCount(9);
  await expect(page.getByTestId("workspace-raster-preview")).toBeVisible();
  await expect(page.getByTestId("history-original-card")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Zielgröße")).toHaveValue("50");
  await expect(page.getByLabel("Anwendungsstatus")).toContainText("9 Varianten");
});
