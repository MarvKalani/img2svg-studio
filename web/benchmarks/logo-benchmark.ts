import { RasterDetailMode, RasterFilterMode } from "../src/conversion/raster-preprocessing.ts";
import { runBenchmark, type BenchmarkScenario } from "./benchmark-runner.ts";

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
  variant("combo-fidelity", { filterSpeckle: 16, pathPrecision: 0 }),
  variant("combo-small-raster", { pathPrecision: 0, rasterResize: "percent-25" }),
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

await runBenchmark({
  demoButtonName: "Logo-Demo laden",
  qualityHeightPixels: 175,
  qualityWidthPixels: 256,
  scenarios,
});

function variant(id: string, overrides: Partial<Omit<BenchmarkScenario, "id">>): BenchmarkScenario {
  return Object.freeze({ ...baseline, ...overrides, id });
}
