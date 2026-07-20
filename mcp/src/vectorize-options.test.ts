import { describe, expect, test } from "vitest";

import { createVectorizeOptions } from "./vectorize-options.js";

describe("vectorize options", () => {
  test("Given a flat logo profile, when options are created, then shape detection and low detail are explicit", () => {
    expect(createVectorizeOptions({ colorCount: 4, detailLevel: "low", mode: "shapes" })).toEqual({
      colorCount: 4,
      colorPrecision: 8,
      detailLevel: "low",
      filterSpeckle: 8,
      mode: "shapes",
      pathPrecision: 0,
      shapeDetectionFlags: 63,
    });
  });

  test("Given requested simplification, when detail decreases, then the speckle threshold increases", () => {
    const high = createVectorizeOptions({
      colorCount: 64,
      detailLevel: "high",
      mode: "trace",
    });
    const medium = createVectorizeOptions({
      colorCount: 16,
      detailLevel: "medium",
      mode: "trace",
    });
    const low = createVectorizeOptions({
      colorCount: 4,
      detailLevel: "low",
      mode: "trace",
    });

    expect([high.filterSpeckle, medium.filterSpeckle, low.filterSpeckle]).toEqual([1, 4, 8]);
    expect([high.pathPrecision, medium.pathPrecision, low.pathPrecision]).toEqual([2, 1, 0]);
    expect([high.shapeDetectionFlags, medium.shapeDetectionFlags, low.shapeDetectionFlags]).toEqual(
      [0, 0, 0],
    );
  });

  test.each([
    { colorCount: 1, detailLevel: "low", mode: "trace" },
    { colorCount: 257, detailLevel: "medium", mode: "trace" },
    { colorCount: 4, detailLevel: "maximum", mode: "trace" },
    { colorCount: 4, detailLevel: "low", mode: "automatic" },
  ])("Given invalid tool values, when options are created, then they are rejected", (input) => {
    expect(() => createVectorizeOptions(input)).toThrow("invalid_parameters");
  });
});
