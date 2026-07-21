import { describe, expect, test } from "vitest";
import {
  RasterFilterMode,
  RasterResizeKind,
  applyRasterFilter,
  applyRasterDetail,
  createRasterPreprocessingOptions,
  defaultRasterPreprocessingOptions,
  preprocessedDimensions,
} from "./raster-preprocessing";

describe("raster preprocessing", () => {
  test("Given one noisy color pixel, when smoothing runs, then energy spreads while alpha stays unchanged", () => {
    const rgba = new Uint8Array(3 * 3 * 4);
    rgba.set([160, 80, 32, 128], (1 * 3 + 1) * 4);

    const smoothed = applyRasterDetail(rgba, 3, 3, {
      sharpenStrength: 0,
      smoothStrength: 100,
    });

    expect(smoothed.slice(16, 20)).toEqual(new Uint8Array([40, 20, 8, 128]));
    expect(smoothed.slice(0, 4)).toEqual(new Uint8Array([10, 5, 2, 0]));
    expect(rgba.slice(16, 20)).toEqual(new Uint8Array([160, 80, 32, 128]));
  });

  test("Given a soft color edge, when sharpening runs, then edge contrast increases without changing alpha", () => {
    const rgba = new Uint8Array([80, 80, 80, 255, 120, 120, 120, 128, 120, 120, 120, 64]);

    const sharpened = applyRasterDetail(rgba, 3, 1, {
      sharpenStrength: 50,
      smoothStrength: 0,
    });

    expect([...sharpened]).toEqual([75, 75, 75, 255, 125, 125, 125, 128, 120, 120, 120, 64]);
  });

  test("Given smoothing and sharpening strengths, when both run, then smoothing is applied before sharpening", () => {
    const rgba = new Uint8Array([40, 40, 40, 255, 120, 120, 120, 255, 200, 200, 200, 255]);

    const combined = applyRasterDetail(rgba, 3, 1, {
      sharpenStrength: 100,
      smoothStrength: 50,
    });
    const smoothed = applyRasterDetail(rgba, 3, 1, {
      sharpenStrength: 0,
      smoothStrength: 50,
    });
    const expected = applyRasterDetail(smoothed, 3, 1, {
      sharpenStrength: 100,
      smoothStrength: 0,
    });

    expect(combined).toEqual(expected);
  });

  test("Given a Full-HD source, when prepared at 2160p, then UHD dimensions preserve its aspect ratio", () => {
    const options = createRasterPreprocessingOptions({
      filterMode: RasterFilterMode.Color,
      monochromeThreshold: 128,
      resize: { heightPixels: 2160, kind: RasterResizeKind.TargetHeight },
      sharpenStrength: 0,
      smoothStrength: 0,
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
      sharpenStrength: 0,
      smoothStrength: 0,
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
        sharpenStrength: 0,
        smoothStrength: 0,
      }),
    ).toThrow();
    expect(() =>
      createRasterPreprocessingOptions({
        filterMode: RasterFilterMode.Monochrome,
        monochromeThreshold: 256,
        resize: { kind: RasterResizeKind.Original },
        sharpenStrength: 0,
        smoothStrength: 0,
      }),
    ).toThrow();
    expect(() =>
      createRasterPreprocessingOptions({
        filterMode: RasterFilterMode.Color,
        monochromeThreshold: 128,
        resize: { kind: RasterResizeKind.Original },
        sharpenStrength: 101,
        smoothStrength: 0,
      }),
    ).toThrow();
  });
});
