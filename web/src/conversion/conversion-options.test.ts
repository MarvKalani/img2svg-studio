import { describe, expect, test } from "vitest";
import {
  createConversionOptions,
  defaultConversionOptions,
  scaledDimensions,
} from "./conversion-options";

describe("conversion options", () => {
  test("Given canonical defaults, when read, then all three values are explicit", () => {
    expect(defaultConversionOptions).toEqual({
      colorPrecision: 7,
      filterSpeckle: 4,
      scalePercent: 100,
    });
  });

  test("Given boundary values, when parsed, then only values inside every range are accepted", () => {
    expect(
      createConversionOptions({ colorPrecision: 1, filterSpeckle: 0, scalePercent: 10 }),
    ).toEqual({ colorPrecision: 1, filterSpeckle: 0, scalePercent: 10 });
    expect(
      createConversionOptions({ colorPrecision: 8, filterSpeckle: 1000, scalePercent: 400 }),
    ).toEqual({ colorPrecision: 8, filterSpeckle: 1000, scalePercent: 400 });
    expect(() =>
      createConversionOptions({ colorPrecision: 0, filterSpeckle: 4, scalePercent: 100 }),
    ).toThrow();
    expect(() =>
      createConversionOptions({ colorPrecision: 7, filterSpeckle: 1001, scalePercent: 100 }),
    ).toThrow();
    expect(() =>
      createConversionOptions({ colorPrecision: 7, filterSpeckle: 4, scalePercent: 401 }),
    ).toThrow();
  });

  test("Given 256 by 128 source pixels, when scaled to 50 percent, then target dimensions stay proportional", () => {
    const options = createConversionOptions({
      colorPrecision: 7,
      filterSpeckle: 4,
      scalePercent: 50,
    });

    expect(scaledDimensions(256, 128, options)).toEqual({ heightPixels: 64, widthPixels: 128 });
  });
});
