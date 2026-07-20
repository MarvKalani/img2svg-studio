import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const lineFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/line.png",
);

test("Given the line fixture and only line detection, when converted, then one native line is shown", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(lineFixturePath);
  await page.getByRole("switch", { name: "Native Formen aktivieren" }).click();
  for (const type of ["Kreis", "Rechteck", "Ellipse", "Polygon"]) {
    await page.getByRole("checkbox", { name: `${type} erkennen` }).uncheck();
  }

  await page.getByRole("button", { name: "Variante übernehmen" }).click();

  const output = page.getByTestId("svg-output");
  const line = output.locator("line");
  await expect(line).toHaveCount(1);
  await expect(line).toHaveAttribute("x1", "48");
  await expect(line).toHaveAttribute("y1", "128");
  await expect(line).toHaveAttribute("x2", "208");
  await expect(line).toHaveAttribute("y2", "128");
  await expect(line).toHaveAttribute("stroke-width", "12");
  await expect(line).toHaveAttribute("stroke", "#F97316");
  await expect(output.locator("path, circle, rect, ellipse, polygon")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText("1 Linie");
  await expect(page.getByTestId("history-card")).toContainText("0 Pfade · 1 Linie");
});
