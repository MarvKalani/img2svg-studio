import { describe, expect, test } from "vitest";
import {
  createShapeDetectionOptions,
  defaultShapeDetectionOptions,
  nativeShapeSchema,
  shapeDetectionFlags,
} from "./shape-options";

describe("shape options", () => {
  test("Given canonical defaults, when read, then detection is off and every supported type is preselected", () => {
    expect(defaultShapeDetectionOptions).toEqual({
      enabled: false,
      types: { circle: true, ellipse: true, line: true, polygon: true, rectangle: true },
    });
    expect(nativeShapeSchema.map((shape) => shape.key)).toEqual([
      "circle",
      "rectangle",
      "ellipse",
      "line",
      "polygon",
    ]);
  });

  test("Given a typed selection, when validated, then an independent copy preserves every switch", () => {
    const input = {
      enabled: true,
      types: { circle: true, ellipse: false, line: false, polygon: true, rectangle: false },
    };

    const options = createShapeDetectionOptions(input);
    input.types.circle = false;

    expect(options).toEqual({
      enabled: true,
      types: { circle: true, ellipse: false, line: false, polygon: true, rectangle: false },
    });
  });

  test("Given global and type switches, when encoded for WASM, then a stable numeric bitfield crosses the boundary", () => {
    expect(shapeDetectionFlags(defaultShapeDetectionOptions)).toBe(0);
    expect(
      shapeDetectionFlags({
        enabled: true,
        types: { circle: true, ellipse: false, line: false, polygon: true, rectangle: false },
      }),
    ).toBe(49);
  });
});
