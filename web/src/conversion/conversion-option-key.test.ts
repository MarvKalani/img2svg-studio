import { describe, expect, test } from "vitest";
import {
  ConversionOptionKey,
  readConversionOptionKey,
  shapeOptionKey,
} from "./conversion-option-key";

describe("conversion option key", () => {
  test("Given DOM values, when parsed, then only known resettable parameters become typed keys", () => {
    expect(readConversionOptionKey("colorPrecision")).toBe(ConversionOptionKey.ColorPrecision);
    expect(readConversionOptionKey("rasterResize")).toBe(ConversionOptionKey.RasterResize);
    expect(readConversionOptionKey("shapeCircle")).toBe(ConversionOptionKey.ShapeCircle);
    expect(readConversionOptionKey("source")).toBeUndefined();
    expect(readConversionOptionKey(undefined)).toBeUndefined();
  });

  test("maps native shape parameters without stringly typed DOM keys", () => {
    expect(shapeOptionKey("polygon")).toBe(ConversionOptionKey.ShapePolygon);
  });
});
