import { describe, expect, test } from "vitest";

import { RasterFilterMode, RasterResizeKind } from "../conversion/raster-preprocessing";
import { createLogoDemoOptions } from "./logo-demo-profile";

describe("logo demo profile", () => {
  test("Given the faceted logo, when the demo profile is created, then preprocessing preserves detail and only polygon recognition is enabled", () => {
    expect(createLogoDemoOptions()).toEqual({
      colorPrecision: 6,
      filterSpeckle: 4,
      preprocessing: {
        filterMode: RasterFilterMode.Color,
        monochromeThreshold: 128,
        resize: { heightPixels: 576, kind: RasterResizeKind.TargetHeight },
      },
      scalePercent: 100,
      shapeDetection: {
        enabled: true,
        types: {
          circle: false,
          ellipse: false,
          line: false,
          polygon: true,
          rectangle: false,
        },
      },
    });
  });
});
