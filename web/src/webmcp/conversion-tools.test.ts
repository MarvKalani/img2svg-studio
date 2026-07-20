import { describe, expect, test, vi } from "vitest";
import { defaultConversionOptions } from "../conversion/conversion-options";
import type { ConversionRun } from "../history/history-store";
import { ImageVersionKind } from "../image/image-version";
import { createConversionTools } from "./conversion-tools";

describe("WebMCP conversion tools", () => {
  test("Given valid parameters, when configure_conversion executes, then the shared validator result is applied and returned", async () => {
    const applyOptions = vi.fn();
    const tools = createConversionTools({
      applyOptions,
      convert: vi.fn(),
      readOptions: () => ({ ...defaultConversionOptions }),
    });
    const configure = tools[0]!;

    const output = JSON.parse(
      await configure.execute({
        colorPrecision: 5,
        cornerThreshold: 90,
        curveFitting: "polygon",
        filterSpeckle: 12,
        hierarchical: "cutout",
        layerDifference: 48,
        lengthThreshold: 5.5,
        maxIterations: 12,
        pathPrecision: 1,
        rasterDetailMode: "smooth",
        monochromeThreshold: 140,
        rasterFilterMode: "monochrome",
        rasterResizePercent: 200,
        scalePercent: 50,
        spliceThreshold: 30,
      }),
    );

    expect(configure.name).toBe("configure_conversion");
    expect(configure.inputSchema).toMatchObject({
      additionalProperties: false,
      properties: {
        colorPrecision: { maximum: 8, minimum: 1, type: "integer" },
        filterSpeckle: { maximum: 1000, minimum: 0, type: "integer" },
        pathPrecision: { maximum: 4, minimum: 0, type: "integer" },
        rasterDetailMode: { enum: ["none", "sharpen", "smooth"], type: "string" },
        rasterFilterMode: { enum: ["color", "grayscale", "monochrome"], type: "string" },
        rasterResizePercent: { enum: [25, 50, 75, 125, 150, 200, 400], type: "integer" },
        rasterTargetHeightPixels: { enum: [576, 720, 1080, 2160], type: "integer" },
        scalePercent: { maximum: 400, minimum: 10, type: "integer" },
      },
      required: ["colorPrecision", "filterSpeckle", "pathPrecision", "scalePercent"],
      type: "object",
    });
    expect(applyOptions).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        colorPrecision: 5,
        cornerThreshold: 90,
        curveFitting: "polygon",
        filterSpeckle: 12,
        hierarchical: "cutout",
        layerDifference: 48,
        lengthThreshold: 5.5,
        maxIterations: 12,
        pathPrecision: 1,
        preprocessing: {
          detailMode: "smooth",
          filterMode: "monochrome",
          monochromeThreshold: 140,
          resize: { kind: "percentage", percent: 200 },
        },
        scalePercent: 50,
        spliceThreshold: 30,
      }),
    );
    expect(output).toMatchObject({
      ok: true,
      options: {
        colorPrecision: 5,
        cornerThreshold: 90,
        curveFitting: "polygon",
        filterSpeckle: 12,
        hierarchical: "cutout",
        layerDifference: 48,
        lengthThreshold: 5.5,
        maxIterations: 12,
        pathPrecision: 1,
        preprocessing: {
          detailMode: "smooth",
          filterMode: "monochrome",
          monochromeThreshold: 140,
          resize: { kind: "percentage", percent: 200 },
        },
        scalePercent: 50,
        spliceThreshold: 30,
      },
    });
  });

  test("Given invalid parameters, when configure_conversion executes, then no UI state is changed and a structured error is returned", async () => {
    const applyOptions = vi.fn();
    const configure = createConversionTools({
      applyOptions,
      convert: vi.fn(),
      readOptions: () => ({ ...defaultConversionOptions }),
    })[0]!;

    const output = JSON.parse(
      await configure.execute({
        colorPrecision: 9,
        filterSpeckle: 4,
        pathPrecision: 2,
        scalePercent: 100,
      }),
    );

    expect(output).toEqual({
      code: "invalid_options",
      message: "Die Konvertierungseinstellungen sind ungültig.",
      ok: false,
    });
    expect(applyOptions).not.toHaveBeenCalled();
  });

  test("Given a loaded image, when convert_current_image executes, then the visible conversion controller returns its run", async () => {
    const convert = vi.fn().mockResolvedValue({ ok: true, run: conversionRun() });
    const tool = createConversionTools({
      applyOptions: vi.fn(),
      convert,
      readOptions: () => ({ ...defaultConversionOptions }),
    })[1]!;

    const output = JSON.parse(await tool.execute({}));

    expect(tool.name).toBe("convert_current_image");
    expect(convert).toHaveBeenCalledOnce();
    expect(output).toEqual({
      fileName: "circle.png",
      heightPixels: 256,
      inputVersion: { id: 1, kind: ImageVersionKind.Original },
      ok: true,
      runId: 1,
      widthPixels: 256,
    });
  });
});

function conversionRun(): ConversionRun {
  return {
    circleCount: 1,
    durationMilliseconds: 10,
    ellipseCount: 0,
    fileName: "circle.png",
    heightPixels: 256,
    id: 1,
    inputVersion: { id: 1, kind: ImageVersionKind.Original },
    lineCount: 0,
    options: defaultConversionOptions,
    pathCount: 0,
    polygonCount: 0,
    rectangleCount: 0,
    svg: "<svg></svg>",
    widthPixels: 256,
  };
}
