import { chromium, type Page } from "playwright";

import { RasterDetailMode, RasterFilterMode } from "../src/conversion/raster-preprocessing.ts";
import { measureLogoQuality, type RgbaRaster } from "../src/optimization/logo-quality.ts";

interface BenchmarkScenario {
  readonly colorPrecision: number;
  readonly detailMode: RasterDetailMode;
  readonly filterMode: RasterFilterMode;
  readonly filterSpeckle: number;
  readonly id: string;
  readonly monochromeThreshold: number;
  readonly pathPrecision: number;
  readonly rasterResize: string;
  readonly scalePercent: number;
  readonly shapeDetection: boolean;
}

interface BenchmarkResult {
  readonly byteSize: number;
  readonly colorSimilarity: number;
  readonly durationMilliseconds: number;
  readonly id: string;
  readonly nativeShapeCount: number;
  readonly pathCount: number;
  readonly silhouetteIntersectionOverUnion: number;
  readonly structuralSimilarity: number;
}

const benchmarkUrl = process.env.IMG2SVG_BENCHMARK_URL ?? "http://127.0.0.1:4173";
const qualityWidthPixels = 256;
const qualityHeightPixels = 175;

const baseline: BenchmarkScenario = Object.freeze({
  colorPrecision: 6,
  detailMode: RasterDetailMode.None,
  filterMode: RasterFilterMode.Color,
  filterSpeckle: 4,
  id: "baseline",
  monochromeThreshold: 128,
  pathPrecision: 2,
  rasterResize: "height-576",
  scalePercent: 100,
  shapeDetection: true,
});

const scenarios = Object.freeze([
  baseline,
  ...[1, 2, 3, 4, 5, 7, 8].map((value) =>
    variant(`color-${String(value)}`, { colorPrecision: value }),
  ),
  ...[0, 1, 2, 8, 16, 32, 64].map((value) =>
    variant(`speckle-${String(value)}`, { filterSpeckle: value }),
  ),
  ...[0, 1, 3, 4].map((value) =>
    variant(`path-precision-${String(value)}`, { pathPrecision: value }),
  ),
  ...["percent-25", "percent-50", "percent-75", "height-720", "original"].map((value) =>
    variant(`raster-${value}`, { rasterResize: value }),
  ),
  variant("detail-smooth", { detailMode: RasterDetailMode.Smooth }),
  variant("detail-sharpen", { detailMode: RasterDetailMode.Sharpen }),
  variant("filter-grayscale", { filterMode: RasterFilterMode.Grayscale }),
  variant("filter-monochrome-64", {
    filterMode: RasterFilterMode.Monochrome,
    monochromeThreshold: 64,
  }),
  variant("filter-monochrome-128", { filterMode: RasterFilterMode.Monochrome }),
  variant("filter-monochrome-192", {
    filterMode: RasterFilterMode.Monochrome,
    monochromeThreshold: 192,
  }),
  variant("svg-scale-50", { scalePercent: 50 }),
  variant("svg-scale-200", { scalePercent: 200 }),
  variant("shape-detection-off", { shapeDetection: false }),
  variant("combo-balanced", {
    colorPrecision: 5,
    detailMode: RasterDetailMode.Smooth,
    filterSpeckle: 8,
    pathPrecision: 1,
  }),
  variant("combo-compact", {
    colorPrecision: 5,
    detailMode: RasterDetailMode.Smooth,
    filterSpeckle: 16,
    pathPrecision: 1,
    rasterResize: "percent-50",
  }),
  variant("combo-clean-color", {
    detailMode: RasterDetailMode.Smooth,
    filterSpeckle: 16,
    pathPrecision: 1,
  }),
  variant("combo-sharp", {
    colorPrecision: 5,
    detailMode: RasterDetailMode.Sharpen,
    filterSpeckle: 8,
    pathPrecision: 1,
  }),
  variant("combo-fidelity", {
    filterSpeckle: 16,
    pathPrecision: 0,
  }),
  variant("combo-small-raster", {
    pathPrecision: 0,
    rasterResize: "percent-25",
  }),
  variant("combo-medium-raster", {
    filterSpeckle: 16,
    pathPrecision: 0,
    rasterResize: "percent-50",
  }),
  variant("combo-color-five", {
    colorPrecision: 5,
    filterSpeckle: 8,
    pathPrecision: 0,
  }),
  variant("combo-color-five-compact", {
    colorPrecision: 5,
    filterSpeckle: 16,
    pathPrecision: 0,
    rasterResize: "percent-50",
  }),
]);

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(benchmarkUrl);
  await page.getByRole("button", { name: "Logo-Demo laden" }).click();
  await page.locator("#source-thumbnail").waitFor({ state: "visible" });
  const reference = await rasterize(page, "#source-thumbnail");
  const results: BenchmarkResult[] = [];
  for (const scenario of scenarios) {
    await applyScenario(page, scenario);
    const historyCards = page.getByTestId("history-card");
    const previousNewestRunId =
      (await historyCards.count()) === 0
        ? "0"
        : ((await historyCards.first().getAttribute("data-run-id")) ?? "0");
    const startedAt = Date.now();
    await page.getByRole("button", { name: "Konvertieren", exact: true }).click();
    await page.waitForFunction(
      (previousRunId) =>
        document.querySelector<HTMLElement>("[data-testid='history-card']")?.dataset.runId !==
        previousRunId,
      previousNewestRunId,
    );
    const durationMilliseconds = Date.now() - startedAt;
    const svg = await page
      .locator("#svg-output svg")
      .evaluate((element) => new XMLSerializer().serializeToString(element));
    const candidate = await rasterize(page, "#svg-output svg");
    const quality = measureLogoQuality(reference, candidate);
    results.push({
      byteSize: new TextEncoder().encode(svg).byteLength,
      ...quality,
      durationMilliseconds,
      id: scenario.id,
      nativeShapeCount: countNativeShapes(svg),
      pathCount: countElements(svg, "path"),
    });
  }
  process.stdout.write(`${JSON.stringify({ results, scenarios }, undefined, 2)}\n`);
} finally {
  await browser.close();
}

function variant(id: string, overrides: Partial<Omit<BenchmarkScenario, "id">>): BenchmarkScenario {
  return Object.freeze({ ...baseline, ...overrides, id });
}

async function applyScenario(page: Page, scenario: BenchmarkScenario): Promise<void> {
  await page.getByLabel("Rastergröße vor Tracing").selectOption(scenario.rasterResize);
  await page.getByLabel("Rasterfilter", { exact: true }).selectOption(scenario.filterMode);
  await page.getByLabel("Raster-Detailfilter").selectOption(scenario.detailMode);
  if (scenario.filterMode === RasterFilterMode.Monochrome) {
    await page
      .getByLabel("Schwarzweiß-Schwellwert", { exact: true })
      .fill(String(scenario.monochromeThreshold));
  }
  await page.getByLabel("Farbpräzision", { exact: true }).fill(String(scenario.colorPrecision));
  await page.getByLabel("Speckle-Filter", { exact: true }).fill(String(scenario.filterSpeckle));
  await page.getByLabel("Pfadpräzision", { exact: true }).fill(String(scenario.pathPrecision));
  await page.getByLabel("Zielgröße").selectOption(String(scenario.scalePercent));
  const shapeSwitch = page.getByRole("switch", { name: "Native Formen aktivieren" });
  if ((await shapeSwitch.getAttribute("aria-checked")) !== String(scenario.shapeDetection)) {
    await shapeSwitch.click();
  }
}

async function rasterize(page: Page, selector: string): Promise<RgbaRaster> {
  const rgba = await page.locator(selector).evaluate(
    async (element, dimensions) => {
      let source: CanvasImageSource;
      let temporaryUrl: string | undefined;
      if (element instanceof SVGSVGElement) {
        const svg = new XMLSerializer().serializeToString(element);
        temporaryUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
        const image = new Image();
        image.src = temporaryUrl;
        await image.decode();
        source = image;
      } else if (element instanceof HTMLImageElement) {
        await element.decode();
        source = element;
      } else {
        throw new TypeError("Benchmark source must be an image or SVG.");
      }
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.widthPixels;
      canvas.height = dimensions.heightPixels;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Benchmark canvas is unavailable.");
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const pixels = Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
      if (temporaryUrl) {
        URL.revokeObjectURL(temporaryUrl);
      }
      return pixels;
    },
    { heightPixels: qualityHeightPixels, widthPixels: qualityWidthPixels },
  );
  return {
    heightPixels: qualityHeightPixels,
    rgba: new Uint8Array(rgba),
    widthPixels: qualityWidthPixels,
  };
}

function countElements(svg: string, elementName: string): number {
  return [...svg.matchAll(new RegExp(`<${elementName}(?:\\s|>)`, "gu"))].length;
}

function countNativeShapes(svg: string): number {
  return ["circle", "ellipse", "line", "polygon", "rect"].reduce(
    (count, elementName) => count + countElements(svg, elementName),
    0,
  );
}
