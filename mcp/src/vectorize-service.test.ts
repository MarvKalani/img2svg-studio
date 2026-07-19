import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { VectorizeError, vectorizeImage } from "./vectorize-service.js";

const circleFixture = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

describe("vectorize image", () => {
  test("Given a PNG fixture as base64, when vectorized twice, then SVG and typed statistics are deterministic", async () => {
    const imageBase64 = (await readFile(circleFixture)).toString("base64");
    const request = {
      colorCount: 4,
      detailLevel: "low" as const,
      imageBase64,
      mode: "shapes" as const,
    };

    const first = await vectorizeImage(request);
    const second = await vectorizeImage(request);

    expect(first).toEqual(second);
    expect(first.svg).toMatch(/^<svg\b/u);
    expect(first.stats).toMatchObject({
      byteSize: Buffer.byteLength(first.svg),
      circleCount: 1,
      heightPixels: 256,
      pathCount: 0,
      widthPixels: 256,
    });
    expect(first.parameters).toEqual({
      colorCount: 4,
      detailLevel: "low",
      mode: "shapes",
    });
  });

  test("Given an oversized encoded input, when vectorization starts, then a stable public error is returned before decoding", async () => {
    await expect(
      vectorizeImage({
        colorCount: 4,
        detailLevel: "low",
        imageBytes: new Uint8Array(25 * 1024 * 1024 + 1),
        mode: "trace",
      }),
    ).rejects.toEqual(expect.objectContaining<VectorizeError>({ code: "image_too_large" }));
  });

  test("Given ambiguous image inputs, when vectorization starts, then a stable input error is returned", async () => {
    await expect(
      vectorizeImage({
        colorCount: 4,
        detailLevel: "low",
        imageBase64: "aW1hZ2U=",
        imageBytes: new Uint8Array([1]),
        mode: "trace",
      }),
    ).rejects.toEqual(expect.objectContaining<VectorizeError>({ code: "invalid_image_input" }));
  });
});
