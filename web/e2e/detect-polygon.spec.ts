import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const triangleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/triangle.png",
);

test("Given the triangle fixture and only polygon detection, when converted, then one native three-point polygon is shown", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(triangleFixturePath);
  await page.getByRole("switch", { name: "Native Formen aktivieren" }).click();
  for (const type of ["Kreis", "Rechteck", "Ellipse", "Linie"]) {
    await page.getByRole("checkbox", { name: `${type} erkennen` }).uncheck();
  }

  await page.getByRole("button", { name: "Konvertieren" }).click();

  const output = page.getByTestId("svg-output");
  const polygon = output.locator("polygon");
  await expect(polygon).toHaveCount(1);
  const points = parsePoints(await polygon.getAttribute("points"));
  expect(points).toHaveLength(3);
  expectWithinTolerance(points, [
    [128, 48],
    [216, 208],
    [40, 208],
  ]);
  await expect(polygon).toHaveAttribute("fill", "#EC4899");
  await expect(output.locator("path, circle, rect, ellipse, line")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText("1 Polygon");
  await expect(page.getByTestId("history-card")).toContainText("0 Pfade · 1 Polygon");
});

function parsePoints(value: string | null): [number, number][] {
  return (value ?? "").split(" ").map((point) => {
    const [x, y] = point.split(",").map(Number);
    return [x ?? Number.NaN, y ?? Number.NaN];
  });
}

function expectWithinTolerance(actual: [number, number][], expected: [number, number][]): void {
  for (const [index, actualPoint] of actual.entries()) {
    const expectedPoint = expected[index];
    expect(expectedPoint).toBeDefined();
    expect(Math.abs(actualPoint[0] - expectedPoint[0])).toBeLessThanOrEqual(2);
    expect(Math.abs(actualPoint[1] - expectedPoint[1])).toBeLessThanOrEqual(2);
  }
}
