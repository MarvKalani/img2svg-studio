import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const rectangleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/rectangle.png",
);

test("Given the rectangle fixture and only rectangle detection, when converted, then one native rectangle is shown", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(rectangleFixturePath);
  await page.getByRole("switch", { name: "Native Formen aktivieren" }).click();
  for (const type of ["Kreis", "Ellipse", "Linie", "Polygon"]) {
    await page.getByRole("checkbox", { name: `${type} erkennen` }).uncheck();
  }

  await page.getByRole("button", { name: "Variante übernehmen" }).click();

  const output = page.getByTestId("svg-output");
  const rectangle = output.locator("rect");
  await expect(rectangle).toHaveCount(1);
  await expect(rectangle).toHaveAttribute("x", "64");
  await expect(rectangle).toHaveAttribute("y", "80");
  await expect(rectangle).toHaveAttribute("width", "128");
  await expect(rectangle).toHaveAttribute("height", "96");
  await expect(rectangle).toHaveAttribute("fill", "#22C55E");
  await expect(output.locator("path, circle, ellipse, line, polygon")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText("1 Rechteck");
  await expect(page.getByTestId("history-card")).toContainText("0 Pfade · 1 Rechteck");
});
