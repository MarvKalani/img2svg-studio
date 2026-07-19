import { describe, expect, test } from "vitest";
import { readSvgMetrics } from "./svg-document";

describe("SVG document metrics", () => {
  test("Given a native circle SVG, when metrics are read, then the circle is counted separately from fallback paths", () => {
    const svg = {
      getAttribute: (name: string) => ({ height: "256", width: "256" })[name] ?? null,
      querySelectorAll: (selector: string) => ({
        length: ["circle", "ellipse", "line", "polygon", "rect"].includes(selector) ? 1 : 0,
      }),
    } as unknown as Element;

    expect(readSvgMetrics(svg)).toEqual({
      circleCount: 1,
      ellipseCount: 1,
      heightPixels: 256,
      lineCount: 1,
      pathCount: 0,
      polygonCount: 1,
      rectangleCount: 1,
      widthPixels: 256,
    });
  });
});
