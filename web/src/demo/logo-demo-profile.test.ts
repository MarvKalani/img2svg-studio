import { describe, expect, test } from "vitest";

import {
  RasterDetailMode,
  RasterFilterMode,
  RasterResizeKind,
} from "../conversion/raster-preprocessing";
import { createLogoDemoOptions } from "./logo-demo-profile";

describe("logo demo profile", () => {
  test("Given the faceted logo, when the demo profile is created, then preprocessing preserves detail and only polygon recognition is enabled", () => {
    expect(createLogoDemoOptions()).toEqual({
      colorPrecision: 6,
      cornerThreshold: 60,
      curveFitting: "spline",
      filterSpeckle: 16,
      hierarchical: "stacked",
      layerDifference: 16,
      lengthThreshold: 4,
      maxIterations: 10,
      pathPrecision: 0,
      preprocessing: {
        detailMode: RasterDetailMode.None,
        filterMode: RasterFilterMode.Color,
        monochromeThreshold: 128,
        resize: { kind: RasterResizeKind.Original },
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
      spliceThreshold: 45,
    });
  });
});
