import sharp from "sharp";

import { selectConnectedRegion, type RasterPixels } from "./connected-region.js";
import {
  decodeRasterImage,
  readEncodedImage,
  type RasterImageInput,
  VectorizeError,
} from "./vectorize-service.js";

export interface NormalizedPoint {
  readonly x: number;
  readonly y: number;
}

export interface AnalyzeImageRegionsRequest extends RasterImageInput {
  readonly sensitivityPercent: number;
}

export interface RemoveBackgroundRegionRequest extends AnalyzeImageRegionsRequest {
  readonly seed: NormalizedPoint;
}

export interface ImageRegionAnalysis extends Record<string, unknown> {
  readonly heightPixels: number;
  readonly previewPngBase64: string;
  readonly regions: readonly RegionCandidate[];
  readonly widthPixels: number;
}

interface RegionCandidate {
  readonly coveragePercent: number;
  readonly pixelCount: number;
  readonly regionNumber: number;
  readonly sampledColor: Readonly<{ alpha: number; blue: number; green: number; red: number }>;
  readonly seed: NormalizedPoint;
}

interface LocatedRegion {
  readonly mask: Uint8Array;
  readonly pixelCount: number;
  readonly seedIndex: number;
}

const maximumRegions = 12;

export async function analyzeImageRegions(
  request: AnalyzeImageRegionsRequest,
): Promise<ImageRegionAnalysis> {
  validateSensitivity(request.sensitivityPercent);
  const raster = await decodeRasterImage(readEncodedImage(request));
  const locatedRegions = locateEdgeRegions(raster, request.sensitivityPercent);
  const totalPixels = raster.widthPixels * raster.heightPixels;
  const regions = locatedRegions.map((region, index) =>
    toCandidate(region, index + 1, raster, totalPixels),
  );
  const previewPng = await createRegionPreview(raster, locatedRegions);
  return Object.freeze({
    heightPixels: raster.heightPixels,
    previewPngBase64: previewPng.toString("base64"),
    regions: Object.freeze(regions),
    widthPixels: raster.widthPixels,
  });
}

export async function removeBackgroundRegion(request: RemoveBackgroundRegionRequest): Promise<{
  imagePngBase64: string;
  stats: Readonly<{
    heightPixels: number;
    removedPercent: number;
    removedPixelCount: number;
    widthPixels: number;
  }>;
}> {
  validateSensitivity(request.sensitivityPercent);
  validateNormalizedPoint(request.seed);
  const raster = await decodeRasterImage(readEncodedImage(request));
  const seedIndex = normalizedPointToIndex(request.seed, raster);
  const region = selectConnectedRegion(raster, seedIndex, request.sensitivityPercent);
  const editedRgba = new Uint8Array(raster.rgba);
  for (let pixelIndex = 0; pixelIndex < region.mask.length; pixelIndex += 1) {
    if ((region.mask[pixelIndex] ?? 0) !== 0) editedRgba[pixelIndex * 4 + 3] = 0;
  }
  const imagePng = await sharp(editedRgba, {
    raw: { channels: 4, height: raster.heightPixels, width: raster.widthPixels },
  })
    // VTracer accepts at most 256 output colors. An indexed PNG preserves
    // transparency while keeping the stateless hand-off small enough for ChatGPT.
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toBuffer();
  return Object.freeze({
    imagePngBase64: imagePng.toString("base64"),
    stats: Object.freeze({
      heightPixels: raster.heightPixels,
      removedPercent: percent(region.pixelCount, region.mask.length),
      removedPixelCount: region.pixelCount,
      widthPixels: raster.widthPixels,
    }),
  });
}

function locateEdgeRegions(raster: RasterPixels, sensitivityPercent: number): LocatedRegion[] {
  const covered = new Uint8Array(raster.widthPixels * raster.heightPixels);
  const located: LocatedRegion[] = [];
  for (const seedIndex of createEdgeSeedIndices(raster.widthPixels, raster.heightPixels)) {
    if ((covered[seedIndex] ?? 0) !== 0) continue;
    const region = selectConnectedRegion(raster, seedIndex, sensitivityPercent);
    for (let pixelIndex = 0; pixelIndex < region.mask.length; pixelIndex += 1) {
      if ((region.mask[pixelIndex] ?? 0) !== 0) covered[pixelIndex] = 1;
    }
    located.push({ ...region, seedIndex });
  }
  return located
    .sort((left, right) => right.pixelCount - left.pixelCount || left.seedIndex - right.seedIndex)
    .slice(0, maximumRegions);
}

function createEdgeSeedIndices(widthPixels: number, heightPixels: number): number[] {
  const xValues = sampleAxis(widthPixels);
  const yValues = sampleAxis(heightPixels);
  const indices = new Set<number>();
  for (const x of xValues) {
    indices.add(x);
    indices.add((heightPixels - 1) * widthPixels + x);
  }
  for (const y of yValues) {
    indices.add(y * widthPixels);
    indices.add(y * widthPixels + widthPixels - 1);
  }
  return [...indices];
}

function sampleAxis(length: number): number[] {
  return [...new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round((length - 1) * ratio)))];
}

function toCandidate(
  region: LocatedRegion,
  regionNumber: number,
  raster: RasterPixels,
  totalPixels: number,
): RegionCandidate {
  const offset = region.seedIndex * 4;
  const xPixels = region.seedIndex % raster.widthPixels;
  const yPixels = Math.floor(region.seedIndex / raster.widthPixels);
  return Object.freeze({
    coveragePercent: percent(region.pixelCount, totalPixels),
    pixelCount: region.pixelCount,
    regionNumber,
    sampledColor: Object.freeze({
      alpha: raster.rgba[offset + 3] ?? 0,
      blue: raster.rgba[offset + 2] ?? 0,
      green: raster.rgba[offset + 1] ?? 0,
      red: raster.rgba[offset] ?? 0,
    }),
    seed: Object.freeze({
      x: normalizePixel(xPixels, raster.widthPixels),
      y: normalizePixel(yPixels, raster.heightPixels),
    }),
  });
}

async function createRegionPreview(
  raster: RasterPixels,
  regions: readonly LocatedRegion[],
): Promise<Buffer> {
  const overlay = new Uint8Array(raster.rgba.length);
  const colors = [
    [0, 220, 255],
    [255, 93, 180],
    [255, 190, 55],
    [114, 235, 140],
  ] as const;
  for (let regionIndex = 0; regionIndex < regions.length; regionIndex += 1) {
    const region = regions[regionIndex];
    const color = colors[regionIndex % colors.length] ?? colors[0];
    if (!region || !color) continue;
    for (let pixelIndex = 0; pixelIndex < region.mask.length; pixelIndex += 1) {
      if ((region.mask[pixelIndex] ?? 0) === 0) continue;
      const offset = pixelIndex * 4;
      overlay[offset] = color[0];
      overlay[offset + 1] = color[1];
      overlay[offset + 2] = color[2];
      overlay[offset + 3] = 72;
    }
  }
  const labelSvg = createLabelSvg(raster, regions);
  return (
    sharp(raster.rgba, {
      raw: { channels: 4, height: raster.heightPixels, width: raster.widthPixels },
    })
      .composite([
        {
          input: Buffer.from(overlay),
          raw: { channels: 4, height: raster.heightPixels, width: raster.widthPixels },
        },
        { input: Buffer.from(labelSvg) },
      ])
      // The preview is visual guidance for the model, so an indexed PNG keeps the
      // tool response small without changing the original used by later tools.
      .png({ compressionLevel: 9, palette: true, quality: 80 })
      .toBuffer()
  );
}

function createLabelSvg(raster: RasterPixels, regions: readonly LocatedRegion[]): string {
  const shortestSide = Math.min(raster.widthPixels, raster.heightPixels);
  const markerRadius = Math.min(
    Math.max(1, Math.floor(shortestSide / 4)),
    Math.max(8, Math.round(shortestSide / 40)),
  );
  const labels = regions
    .map((region, index) => {
      // Edge seeds stay exact in the tool result; only the visual label moves inward to remain legible.
      const x = clampMarker(
        region.seedIndex % raster.widthPixels,
        markerRadius,
        raster.widthPixels,
      );
      const y = clampMarker(
        Math.floor(region.seedIndex / raster.widthPixels),
        markerRadius,
        raster.heightPixels,
      );
      return `<circle cx="${x}" cy="${y}" r="${markerRadius}" fill="#071923" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y}" fill="#fff" font-family="sans-serif" font-size="${markerRadius}" font-weight="700" text-anchor="middle" dominant-baseline="central">${index + 1}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${raster.widthPixels}" height="${raster.heightPixels}">${labels}</svg>`;
}

function clampMarker(pixel: number, radius: number, length: number): number {
  return Math.min(Math.max(pixel, radius), Math.max(radius, length - radius));
}

function normalizedPointToIndex(point: NormalizedPoint, raster: RasterPixels): number {
  const xPixels = Math.round(point.x * (raster.widthPixels - 1));
  const yPixels = Math.round(point.y * (raster.heightPixels - 1));
  return yPixels * raster.widthPixels + xPixels;
}

function normalizePixel(pixel: number, length: number): number {
  return length === 1 ? 0 : Number((pixel / (length - 1)).toFixed(6));
}

function percent(part: number, total: number): number {
  return Number(((part / total) * 100).toFixed(2));
}

function validateSensitivity(sensitivityPercent: number): void {
  if (!Number.isFinite(sensitivityPercent) || sensitivityPercent < 0 || sensitivityPercent > 100) {
    throw new VectorizeError("invalid_parameters", "Region sensitivity must be from 0 to 100.");
  }
}

function validateNormalizedPoint(point: NormalizedPoint): void {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.x > 1 ||
    point.y < 0 ||
    point.y > 1
  ) {
    throw new VectorizeError("invalid_parameters", "Region coordinates must be from 0 to 1.");
  }
}
