import { RasterDetailMode, RasterFilterMode } from "../src/conversion/raster-preprocessing.ts";
import { runBenchmark, type BenchmarkScenario } from "./benchmark-runner.ts";

const baseline: BenchmarkScenario = Object.freeze({
  colorPrecision: 7,
  detailMode: RasterDetailMode.None,
  filterMode: RasterFilterMode.Color,
  filterSpeckle: 8,
  id: "illustration-original",
  monochromeThreshold: 128,
  pathPrecision: 1,
  rasterResize: "original",
  scalePercent: 100,
  shapeDetection: false,
});

const scenarios = Object.freeze([
  baseline,
  variant("balanced-75", {
    colorPrecision: 6,
    filterSpeckle: 12,
    pathPrecision: 1,
    rasterResize: "percent-75",
  }),
  variant("compact-50", {
    colorPrecision: 5,
    detailMode: RasterDetailMode.Smooth,
    filterSpeckle: 16,
    pathPrecision: 0,
    rasterResize: "percent-50",
  }),
  variant("contours-grayscale-50", {
    colorPrecision: 5,
    filterMode: RasterFilterMode.Grayscale,
    filterSpeckle: 12,
    pathPrecision: 0,
    rasterResize: "percent-50",
  }),
]);

await runBenchmark({
  demoButtonName: "Topografie-Demo laden",
  qualityHeightPixels: 171,
  qualityWidthPixels: 256,
  scenarios,
});

function variant(id: string, overrides: Partial<Omit<BenchmarkScenario, "id">>): BenchmarkScenario {
  return Object.freeze({ ...baseline, ...overrides, id });
}
