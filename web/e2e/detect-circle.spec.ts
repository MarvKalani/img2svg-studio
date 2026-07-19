import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given the circle fixture and only circle detection, when converted, then one native circle and its statistic are shown", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  await page.getByRole("switch", { name: "Native Formen aktivieren" }).click();
  for (const type of ["Rechteck", "Ellipse", "Linie", "Polygon"]) {
    await page.getByRole("checkbox", { name: `${type} erkennen` }).uncheck();
  }

  await page.getByRole("button", { name: "Konvertieren" }).click();

  const output = page.getByTestId("svg-output");
  const circle = output.locator("circle");
  await expect(circle).toHaveCount(1);
  await expect(circle).toHaveAttribute("cx", "128");
  await expect(circle).toHaveAttribute("cy", "128");
  await expect(circle).toHaveAttribute("r", "64");
  await expect(circle).toHaveAttribute("fill", "#0EA5E9");
  await expect(output.locator("path, rect, ellipse, line, polygon")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText("1 Kreis");
  await expect(page.getByTestId("history-card")).toContainText("0 Pfade · 1 Kreis");
});
