import sharp from "sharp";
import { describe, expect, test } from "vitest";

import { analyzeImageRegions, removeBackgroundRegion } from "./image-region-service.js";
import { vectorizeImage } from "./vectorize-service.js";

describe("MCP image regions", () => {
  test("Given a bordered subject, when regions are analyzed, then the largest edge region has a normalized seed and visible preview", async () => {
    const imageBytes = await createFixture();

    const result = await analyzeImageRegions({ imageBytes, sensitivityPercent: 0 });

    expect(result).toMatchObject({ heightPixels: 3, widthPixels: 3 });
    expect(result.regions[0]).toEqual({
      coveragePercent: 88.89,
      pixelCount: 8,
      regionNumber: 1,
      sampledColor: { alpha: 255, blue: 240, green: 20, red: 10 },
      seed: { x: 0, y: 0 },
    });
    expect(Buffer.from(result.previewPngBase64, "base64").subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  });

  test("Given an analyzed background seed, when it is removed, then only that connected region becomes transparent and remains vectorizable", async () => {
    const imageBytes = await createFixture();

    const removed = await removeBackgroundRegion({
      imageBytes,
      seed: { x: 0, y: 0 },
      sensitivityPercent: 0,
    });
    const { data, info } = await sharp(Buffer.from(removed.imagePngBase64, "base64"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(removed.stats).toEqual({
      heightPixels: 3,
      removedPixelCount: 8,
      removedPercent: 88.89,
      widthPixels: 3,
    });
    expect(data[3]).toBe(0);
    expect(data[(1 * info.width + 1) * 4 + 3]).toBe(255);

    const vectorized = await vectorizeImage({
      colorCount: 2,
      detailLevel: "low",
      imageBase64: removed.imagePngBase64,
      mode: "shapes",
    });
    expect(vectorized.svg).toMatch(/^<svg\b/u);
  });

  test("Given invalid normalized coordinates, when removal is requested, then the request is rejected before editing", async () => {
    const imageBytes = await createFixture();

    await expect(
      removeBackgroundRegion({
        imageBytes,
        seed: { x: 1.01, y: 0 },
        sensitivityPercent: 0,
      }),
    ).rejects.toMatchObject({ code: "invalid_parameters" });
  });
});

async function createFixture(): Promise<Uint8Array> {
  const background = [10, 20, 240, 255];
  const subject = [220, 30, 40, 255];
  const rgba = Uint8Array.from([
    ...background,
    ...background,
    ...background,
    ...background,
    ...subject,
    ...background,
    ...background,
    ...background,
    ...background,
  ]);
  return sharp(rgba, { raw: { channels: 4, height: 3, width: 3 } })
    .png()
    .toBuffer();
}
