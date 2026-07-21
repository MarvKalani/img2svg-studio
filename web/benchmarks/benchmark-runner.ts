import { chromium, type Page } from "playwright";

import {
  RasterFilterMode,
  type RasterFilterMode as RasterFilterModeValue,
} from "../src/conversion/raster-preprocessing.ts";
import { measureLogoQuality, type RgbaRaster } from "../src/optimization/logo-quality.ts";

export interface BenchmarkScenario {
  readonly colorPrecision: number;
  readonly filterMode: RasterFilterModeValue;
  readonly filterSpeckle: number;
  readonly id: string;
  readonly monochromeThreshold: number;
  readonly pathPrecision: number;
  readonly rasterResize: string;
  readonly scalePercent: number;
  readonly shapeDetection: boolean;
  readonly sharpenStrength: number;
  readonly smoothStrength: number;
}

export interface BenchmarkPlan {
  readonly demoButtonName: string;
  readonly qualityHeightPixels: number;
  readonly qualityWidthPixels: number;
  readonly scenarios: readonly BenchmarkScenario[];
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
  readonly totalMilliseconds: number;
}

const benchmarkUrl = process.env.IMG2SVG_BENCHMARK_URL ?? "http://127.0.0.1:4173";

export async function runBenchmark(plan: BenchmarkPlan): Promise<void> {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(benchmarkUrl);
    await page.getByRole("button", { name: plan.demoButtonName }).click();
    await page.locator("#source-thumbnail").waitFor({ state: "visible" });
    await page.locator("#convert-button:not([disabled])").waitFor({ state: "attached" });
    const reference = await rasterize(
      page,
      "#source-thumbnail",
      plan.qualityWidthPixels,
      plan.qualityHeightPixels,
    );
    const sourceByteSize = await page.locator("#source-thumbnail").evaluate(async (element) => {
      if (!(element instanceof HTMLImageElement)) throw new TypeError("Source is not an image.");
      return (await (await fetch(element.src)).blob()).size;
    });
    const results: BenchmarkResult[] = [];

    for (const scenario of plan.scenarios) {
      const startedAt = Date.now();
      await applyScenario(page, scenario);
      await page.locator("#convert-button:not([disabled])").waitFor({ state: "attached" });
      const totalMilliseconds = Date.now() - startedAt;
      const previousNewestRunId = await newestRunId(page);
      await page.locator("#convert-button").click();
      await page.waitForFunction(
        (previousRunId) =>
          document.querySelector<HTMLElement>("[data-testid='history-card']")?.dataset.runId !==
          previousRunId,
        previousNewestRunId,
      );
      const newestCard = page.getByTestId("history-card").first();
      const durationMilliseconds = parseDuration(
        (await newestCard.locator("small").textContent()) ?? "",
      );
      const svg = await page
        .locator("#svg-output svg")
        .evaluate((element) => new XMLSerializer().serializeToString(element));
      const candidate = await rasterize(
        page,
        "#svg-output svg",
        plan.qualityWidthPixels,
        plan.qualityHeightPixels,
      );
      const quality = measureLogoQuality(reference, candidate);
      results.push({
        byteSize: new TextEncoder().encode(svg).byteLength,
        ...quality,
        durationMilliseconds,
        id: scenario.id,
        nativeShapeCount: countNativeShapes(svg),
        pathCount: countElements(svg, "path"),
        totalMilliseconds,
      });
    }
    process.stdout.write(
      `${JSON.stringify({ results, scenarios: plan.scenarios, sourceByteSize }, undefined, 2)}\n`,
    );
  } finally {
    await browser.close();
  }
}

async function newestRunId(page: Page): Promise<string> {
  const cards = page.getByTestId("history-card");
  return (await cards.count()) === 0
    ? "0"
    : ((await cards.first().getAttribute("data-run-id")) ?? "0");
}

async function applyScenario(page: Page, scenario: BenchmarkScenario): Promise<void> {
  const colorPrecision = page.getByLabel("Farbpräzision", { exact: true });
  await colorPrecision.fill(String(scenario.colorPrecision === 8 ? 7 : 8));
  await page.getByLabel("Rastergröße vor Tracing").selectOption(scenario.rasterResize);
  await page.getByLabel("Rasterfilter", { exact: true }).selectOption(scenario.filterMode);
  await page.getByLabel("Glättungsstärke").fill(String(scenario.smoothStrength));
  await page.getByLabel("Schärfungsstärke").fill(String(scenario.sharpenStrength));
  if (scenario.filterMode === RasterFilterMode.Monochrome) {
    await page
      .getByLabel("Schwarzweiß-Schwellwert", { exact: true })
      .fill(String(scenario.monochromeThreshold));
  }
  await page.getByLabel("Speckle-Filter", { exact: true }).fill(String(scenario.filterSpeckle));
  await page.getByLabel("Pfadpräzision", { exact: true }).fill(String(scenario.pathPrecision));
  await page.getByLabel("Zielgröße").selectOption(String(scenario.scalePercent));
  const shapeSwitch = page.getByRole("switch", { name: "Native Formen aktivieren" });
  if ((await shapeSwitch.getAttribute("aria-checked")) !== String(scenario.shapeDetection)) {
    await shapeSwitch.click();
  }
  await colorPrecision.fill(String(scenario.colorPrecision));
}

async function rasterize(
  page: Page,
  selector: string,
  widthPixels: number,
  heightPixels: number,
): Promise<RgbaRaster> {
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
      if (!context) throw new Error("Benchmark canvas is unavailable.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const pixels = Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
      return pixels;
    },
    { heightPixels, widthPixels },
  );
  return { heightPixels, rgba: new Uint8Array(rgba), widthPixels };
}

function parseDuration(metrics: string): number {
  const match = metrics.match(/· (\d+) ms$/u);
  if (!match?.[1]) throw new Error("History card has no conversion duration.");
  return Number(match[1]);
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
