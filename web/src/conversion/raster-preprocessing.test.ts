import { describe, expect, test } from "vitest";
import {
  RasterFilterMode,
  RasterResizeKind,
  applyRasterFilter,
  createRasterPreprocessingOptions,
  defaultRasterPreprocessingOptions,
  preprocessedDimensions,
} from "./raster-preprocessing";

describe("raster preprocessing", () => {
  test("Given a Full-HD source, when prepared at 2160p, then UHD dimensions preserve its aspect ratio", () => {
    const options = createRasterPreprocessingOptions({
      filterMode: RasterFilterMode.Color,
      monochromeThreshold: 128,
      resize: { heightPixels: 2160, kind: RasterResizeKind.TargetHeight },
    });

    expect(preprocessedDimensions(1920, 1080, options)).toEqual({
      heightPixels: 2160,
      widthPixels: 3840,
    });
  });

  test("Given a portrait source, when prepared at 576p, then width is derived without distortion", () => {
    const options = {
      ...defaultRasterPreprocessingOptions,
      resize: { heightPixels: 576, kind: RasterResizeKind.TargetHeight } as const,
    };

    expect(preprocessedDimensions(1080, 1920, options)).toEqual({
      heightPixels: 576,
      widthPixels: 324,
    });
  });

  test("Given an arbitrary source, when prepared at 200 percent, then both dimensions double", () => {
    const options = {
      ...defaultRasterPreprocessingOptions,
      resize: { kind: RasterResizeKind.Percentage, percent: 200 } as const,
    };

    expect(preprocessedDimensions(1000, 333, options)).toEqual({
      heightPixels: 666,
      widthPixels: 2000,
    });
  });

  test("Given one translucent color pixel, when grayscale and monochrome filters run, then luminance changes while alpha remains", () => {
    const rgba = new Uint8Array([14, 165, 233, 128]);

    const grayscale = applyRasterFilter(rgba, {
      ...defaultRasterPreprocessingOptions,
      filterMode: RasterFilterMode.Grayscale,
    });
    const monochrome = applyRasterFilter(rgba, {
      filterMode: RasterFilterMode.Monochrome,
      monochromeThreshold: 128,
      resize: { kind: RasterResizeKind.Original },
    });

    expect([...grayscale]).toEqual([127, 127, 127, 128]);
    expect([...monochrome]).toEqual([0, 0, 0, 128]);
    expect([...rgba]).toEqual([14, 165, 233, 128]);
  });

  test("Given an unsupported height or threshold, when options are created, then validation rejects them", () => {
    expect(() =>
      createRasterPreprocessingOptions({
        filterMode: RasterFilterMode.Color,
        monochromeThreshold: 128,
        resize: { heightPixels: 1081, kind: RasterResizeKind.TargetHeight },
      }),
    ).toThrow();
    expect(() =>
      createRasterPreprocessingOptions({
        filterMode: RasterFilterMode.Monochrome,
        monochromeThreshold: 256,
        resize: { kind: RasterResizeKind.Original },
      }),
    ).toThrow();
  });
});
