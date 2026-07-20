import { describe, expect, test } from "vitest";
import { measureLogoQuality } from "./logo-quality";

describe("logo quality", () => {
  test("Given identical rasterizations, when quality is measured, then every metric is perfect", () => {
    const raster = {
      heightPixels: 2,
      rgba: new Uint8Array([0, 0, 0, 255, 255, 0, 128, 255, 0, 128, 255, 255, 255, 255, 255, 255]),
      widthPixels: 2,
    };

    expect(measureLogoQuality(raster, raster)).toEqual({
      colorSimilarity: 1,
      silhouetteIntersectionOverUnion: 1,
      structuralSimilarity: 1,
    });
  });

  test("Given a colored logo and an empty result, when quality is measured, then destruction cannot score as good", () => {
    const reference = {
      heightPixels: 2,
      rgba: new Uint8Array([0, 0, 0, 255, 255, 0, 128, 255, 0, 128, 255, 255, 255, 255, 255, 255]),
      widthPixels: 2,
    };
    const empty = {
      ...reference,
      rgba: new Uint8Array(16),
    };

    const quality = measureLogoQuality(reference, empty);

    expect(quality.colorSimilarity).toBeLessThan(0.5);
    expect(quality.silhouetteIntersectionOverUnion).toBe(0);
    expect(quality.structuralSimilarity).toBeLessThan(0.5);
  });
});
