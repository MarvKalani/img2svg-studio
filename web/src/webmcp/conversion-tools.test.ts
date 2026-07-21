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
      cancel: vi.fn(),
      convert: vi.fn(),
      listPresets: () => [],
      loadPreset: vi.fn(),
      readOptions: () => ({ ...defaultConversionOptions }),
      savePreset: vi.fn(),
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
        rasterSharpenStrength: 35,
        rasterSmoothStrength: 70,
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
        rasterSharpenStrength: { maximum: 100, minimum: 0, type: "integer" },
        rasterSmoothStrength: { maximum: 100, minimum: 0, type: "integer" },
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
          filterMode: "monochrome",
          monochromeThreshold: 140,
          resize: { kind: "percentage", percent: 200 },
          sharpenStrength: 35,
          smoothStrength: 70,
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
          filterMode: "monochrome",
          monochromeThreshold: 140,
          resize: { kind: "percentage", percent: 200 },
          sharpenStrength: 35,
          smoothStrength: 70,
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
      cancel: vi.fn(),
      convert: vi.fn(),
      listPresets: () => [],
      loadPreset: vi.fn(),
      readOptions: () => ({ ...defaultConversionOptions }),
      savePreset: vi.fn(),
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
      cancel: vi.fn(),
      convert,
      listPresets: () => [],
      loadPreset: vi.fn(),
      readOptions: () => ({ ...defaultConversionOptions }),
      savePreset: vi.fn(),
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
      sizeBytes: 11,
      widthPixels: 256,
    });
  });

  test("Given an active preview, when cancel_conversion executes, then the shared controller cancels it", async () => {
    const cancel = vi.fn().mockReturnValue(true);
    const tool = createConversionTools({
      applyOptions: vi.fn(),
      cancel,
      convert: vi.fn(),
      listPresets: () => [],
      loadPreset: vi.fn(),
      readOptions: () => ({ ...defaultConversionOptions }),
      savePreset: vi.fn(),
    })[2]!;

    const output = JSON.parse(await tool.execute({}));

    expect(tool.name).toBe("cancel_conversion");
    expect(cancel).toHaveBeenCalledOnce();
    expect(output).toEqual({ cancelled: true, ok: true });
  });

  test("Given visible settings, when WebMCP saves, lists and loads a preset, then it uses the shared preset services", async () => {
    const preset = { name: "Agent Logo", options: defaultConversionOptions };
    const savePreset = vi.fn(() => preset);
    const loadPreset = vi.fn(() => preset);
    const tools = createConversionTools({
      applyOptions: vi.fn(),
      cancel: vi.fn(),
      convert: vi.fn(),
      listPresets: () => [preset],
      loadPreset,
      readOptions: () => ({ ...defaultConversionOptions }),
      savePreset,
    });

    expect(tools.map((tool) => tool.name)).toEqual([
      "configure_conversion",
      "convert_current_image",
      "cancel_conversion",
      "list_conversion_presets",
      "save_conversion_preset",
      "load_conversion_preset",
    ]);
    expect(JSON.parse(await tools[3]!.execute({}))).toMatchObject({
      ok: true,
      presets: [{ name: "Agent Logo" }],
    });
    expect(JSON.parse(await tools[4]!.execute({ name: "Agent Logo" }))).toMatchObject({ ok: true });
    expect(JSON.parse(await tools[5]!.execute({ name: "Agent Logo" }))).toMatchObject({ ok: true });
    expect(savePreset).toHaveBeenCalledWith("Agent Logo");
    expect(loadPreset).toHaveBeenCalledWith("Agent Logo");
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
