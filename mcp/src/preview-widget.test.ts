import { describe, expect, test } from "vitest";

import { createPreviewResult, previewWidgetHtml } from "./preview-widget.js";

const circleSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><circle cx="128" cy="128" r="64" fill="#0EA5E9"/></svg>';

describe("SVG preview widget", () => {
  test("Given a converter SVG, when the preview result is created, then exact bytes and structural statistics are preserved", () => {
    const result = createPreviewResult(circleSvg);

    expect(result.svg).toBe(circleSvg);
    expect(result.stats).toEqual({
      byteSize: Buffer.byteLength(circleSvg),
      circleCount: 1,
      elementCount: 1,
      pathCount: 0,
    });
  });

  test.each(["", "<html></html>", `<svg>${"x".repeat(5 * 1024 * 1024)}</svg>`])(
    "Given invalid or excessive markup, when previewed, then a stable validation error is returned",
    (svg) => {
      expect(() => createPreviewResult(svg)).toThrow("invalid_svg");
    },
  );

  test("Given the widget resource, when inspected, then it uses an image context and an exact SVG Blob download", () => {
    expect(previewWidgetHtml).toContain('id="svg-preview"');
    expect(previewWidgetHtml).toContain('type: "image/svg+xml"');
    expect(previewWidgetHtml).toContain('download = "img2svg-result.svg"');
    expect(previewWidgetHtml).toContain('message.method === "ui/notifications/tool-result"');
    expect(previewWidgetHtml).toContain("toolResponseMetadata");
    expect(previewWidgetHtml).toContain("mcp_tool_result");
    expect(previewWidgetHtml).not.toContain("preview.innerHTML");
  });
});
