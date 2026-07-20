import { describe, expect, test } from "vitest";

import { createTopographyDemoOptions } from "./topography-demo-profile";

describe("topography demo profile", () => {
  test("Given the dense contour fixture, when its measured profile is created, then it keeps color and reduces the traced raster to 75 percent", () => {
    expect(createTopographyDemoOptions()).toMatchObject({
      colorPrecision: 6,
      filterSpeckle: 12,
      pathPrecision: 1,
      preprocessing: {
        detailMode: "none",
        filterMode: "color",
        resize: { kind: "percentage", percent: 75 },
      },
      shapeDetection: { enabled: false },
    });
  });
});
