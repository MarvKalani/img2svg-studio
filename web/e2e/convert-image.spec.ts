import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given the loaded circle fixture, when its live preview is accepted, then a deterministic transparent SVG is recorded", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  await page.getByRole("button", { name: "Variante übernehmen" }).click();

  const svgOutput = page.getByTestId("svg-output");
  await expect(svgOutput.locator("svg")).toHaveAttribute("viewBox", "0 0 256 256");
  await expect(svgOutput.locator("path").first()).toBeVisible();
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText(
    "Variante 1 übernommen",
  );
});
