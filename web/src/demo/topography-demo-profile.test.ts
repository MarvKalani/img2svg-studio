import { describe, expect, test } from "vitest";

import { createTopographyDemoOptions } from "./topography-demo-profile";

describe("topography demo profile", () => {
  test("Given the dense contour fixture, when its measured profile is created, then it keeps color and reduces the traced raster to 75 percent", () => {
    expect(createTopographyDemoOptions()).toMatchObject({
      colorPrecision: 6,
      filterSpeckle: 12,
      pathPrecision: 1,
      preprocessing: {
        filterMode: "color",
        resize: { kind: "percentage", percent: 75 },
        sharpenStrength: 0,
        smoothStrength: 0,
      },
      shapeDetection: { enabled: false },
    });
  });
});
