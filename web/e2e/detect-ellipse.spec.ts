import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const ellipseFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/ellipse.png",
);

test("Given the ellipse fixture with circle and ellipse detection, when converted, then one native ellipse is shown", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(ellipseFixturePath);
  await page.getByRole("switch", { name: "Native Formen aktivieren" }).click();
  for (const type of ["Rechteck", "Linie", "Polygon"]) {
    await page.getByRole("checkbox", { name: `${type} erkennen` }).uncheck();
  }

  await page.getByRole("button", { name: "Konvertieren" }).click();

  const output = page.getByTestId("svg-output");
  const ellipse = output.locator("ellipse");
  await expect(ellipse).toHaveCount(1);
  await expect(ellipse).toHaveAttribute("cx", "128");
  await expect(ellipse).toHaveAttribute("cy", "128");
  await expect(ellipse).toHaveAttribute("rx", "80");
  await expect(ellipse).toHaveAttribute("ry", "48");
  await expect(ellipse).toHaveAttribute("fill", "#8B5CF6");
  await expect(output.locator("path, circle, rect, line, polygon")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText("1 Ellipse");
  await expect(page.getByTestId("history-card")).toContainText("0 Pfade · 1 Ellipse");
});
