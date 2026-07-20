import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const mixedFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/mixed.png",
);

test("Given the mixed fixture and all detectors, when the same effective preview is accepted twice, then native shapes keep manifest order and identical bytes", async ({
  page,
}) => {
  const unexpectedRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = request.url();
    const isLocalRequest = ["http://127.0.0.1:4173/", "blob:http://127.0.0.1:4173/"].some(
      (allowedPrefix) => requestUrl.startsWith(allowedPrefix),
    );
    if (!isLocalRequest) {
      unexpectedRequests.push(requestUrl);
    }
  });
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(mixedFixturePath);
  await page.getByRole("switch", { name: "Native Formen aktivieren" }).click();
  const convertButton = page.getByRole("button", { name: "Variante übernehmen" });

  await convertButton.click();
  const output = page.getByTestId("svg-output");
  await expect(output.locator(":scope > svg > *")).toHaveCount(4);
  expect(await output.locator(":scope > svg > *").evaluateAll(elementNames)).toEqual([
    "circle",
    "rect",
    "line",
    "polygon",
  ]);
  await expect(output.locator("circle")).toHaveAttribute("fill", "#0EA5E9");
  await expect(output.locator("rect")).toHaveAttribute("fill", "#22C55E");
  await expect(output.locator("line")).toHaveAttribute("stroke", "#F97316");
  await expect(output.locator("polygon")).toHaveAttribute("fill", "#EC4899");
  await expectNumberAttributes(output.locator("circle"), { cx: 64, cy: 64, r: 28 });
  await expectNumberAttributes(output.locator("rect"), { x: 128, y: 36, width: 80, height: 56 });
  await expectNumberAttributes(output.locator("line"), {
    x1: 32,
    y1: 152,
    x2: 224,
    y2: 152,
    "stroke-width": 10,
  });
  expectPointsWithinTolerance(await output.locator("polygon").getAttribute("points"), [
    [128, 180],
    [184, 232],
    [72, 232],
  ]);
  await expect(output.locator("path, ellipse")).toHaveCount(0);
  const firstSvg = await serializedOutput(page);

  await page.getByLabel("Zielgröße").selectOption("50");
  await expect(output.locator("svg")).toHaveAttribute("viewBox", "0 0 128 128");
  await page.getByLabel("Zielgröße").selectOption("100");
  await convertButton.click();

  expect(await serializedOutput(page)).toBe(firstSvg);
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText(
    "1 Kreis · 1 Rechteck · 1 Linie · 1 Polygon",
  );
  await expect(page.getByTestId("history-card")).toHaveCount(2);
  await expect(page.getByTestId("history-card").first()).toContainText(
    "0 Pfade · 1 Kreis · 1 Rechteck · 1 Linie · 1 Polygon",
  );
  expect(unexpectedRequests).toEqual([]);
});

function elementNames(elements: Element[]): string[] {
  return elements.map((element) => element.localName);
}

async function expectNumberAttributes(
  locator: import("@playwright/test").Locator,
  expected: Record<string, number>,
): Promise<void> {
  for (const [name, expectedValue] of Object.entries(expected)) {
    const actualValue = Number(await locator.getAttribute(name));
    expect(Math.abs(actualValue - expectedValue)).toBeLessThanOrEqual(2);
  }
}

function expectPointsWithinTolerance(value: string | null, expected: [number, number][]): void {
  const actual = (value ?? "").split(" ").map((point) => point.split(",").map(Number));
  expect(actual).toHaveLength(expected.length);
  for (const [index, [actualX, actualY]] of actual.entries()) {
    const expectedPoint = expected[index];
    expect(expectedPoint).toBeDefined();
    expect(Math.abs((actualX ?? Number.NaN) - expectedPoint[0])).toBeLessThanOrEqual(2);
    expect(Math.abs((actualY ?? Number.NaN) - expectedPoint[1])).toBeLessThanOrEqual(2);
  }
}

async function serializedOutput(page: import("@playwright/test").Page): Promise<string> {
  return page
    .getByTestId("svg-output")
    .locator("svg")
    .evaluate((svg) => new XMLSerializer().serializeToString(svg));
}
