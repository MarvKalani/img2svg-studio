import { describe, expect, test, vi } from "vitest";
import { MaskPolarity } from "../ai/sam-selection";
import { originalSource, processedSource } from "../compare/comparison-source";
import { defaultConversionOptions } from "../conversion/conversion-options";
import { ImageVersionKind } from "../image/image-version";
import { createStudioTools, type StudioToolServices } from "./studio-tools";

describe("complete Studio WebMCP tools", () => {
  test("Given the application services, when tools are created, then every advertised visible command has one stable tool", () => {
    const tools = createStudioTools(services());

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toEqual([
      "get_workspace_state",
      "select_history_run",
      "delete_history_run",
      "select_comparison_a",
      "select_comparison_b",
      "download_selected_svg",
      "load_model",
      "retry_model",
      "unload_model",
      "preview_magic_wand_selection",
      "apply_magic_wand_selection",
      "apply_background_removal",
      "apply_smart_selection",
    ]);
    expect(new Set(toolNames).size).toBe(toolNames.length);
  });

  test("Given visible state, when get_workspace_state executes, then it returns concise immutable snapshots without SVG or pixels", async () => {
    const tool = createStudioTools(services())[0]!;

    const output = JSON.parse(await tool.execute({}));

    expect(output).toEqual({
      comparison: {},
      history: [],
      image: { loaded: false },
      models: [],
      options: defaultConversionOptions,
    });
    expect(JSON.stringify(output)).not.toContain("svg");
  });

  test("Given shader-f16 is unavailable, when tools are created, then SlimSAM is not offered to users or agents", () => {
    const tools = createStudioTools(services(), {
      modelIds: ["modnet"],
      smartSelection: false,
    });

    expect(tools.map((tool) => tool.name)).not.toContain("apply_smart_selection");
    const loadModel = tools.find((tool) => tool.name === "load_model")!;
    expect(loadModel.inputSchema).toMatchObject({
      properties: { modelId: { enum: ["modnet"] } },
    });
  });

  test("Given too few Smart Select points, when apply_smart_selection executes, then the request is rejected before application state changes", async () => {
    const applicationServices = services();
    const tool = createStudioTools(applicationServices).at(-1)!;

    const output = JSON.parse(
      await tool.execute({
        negativePoints: [],
        polarity: MaskPolarity.Selected,
        positivePoints: [{ x: 0.5, y: 0.5 }],
      }),
    );

    expect(output).toMatchObject({ code: "invalid_input", ok: false });
    expect(applicationServices.applySmartSelection).not.toHaveBeenCalled();
  });

  test("Given normalized Magic Wand input, when preview and apply execute, then both delegate the visible two-step workflow", async () => {
    const applicationServices = services();
    applicationServices.previewMagicWandSelection = vi.fn(async () =>
      Object.freeze({
        coveragePercent: 37.36,
        ok: true as const,
        seed: Object.freeze({ xPixels: 12, yPixels: 8 }),
        selectedPixelCount: 418_876,
        sensitivityPercent: 15,
        source: "original" as const,
      }),
    );
    applicationServices.applyMagicWandSelection = vi.fn(async () =>
      Object.freeze({
        fileName: "marv-kalani-logo-zauberstab.png",
        ok: true as const,
        selectedPixelCount: 418_876,
      }),
    );
    const tools = createStudioTools(applicationServices);

    const preview = JSON.parse(
      await tools
        .find((tool) => tool.name === "preview_magic_wand_selection")!
        .execute({ sensitivityPercent: 15, source: "original", x: 0.01, y: 0.01 }),
    );
    const applied = JSON.parse(
      await tools.find((tool) => tool.name === "apply_magic_wand_selection")!.execute({}),
    );

    expect(preview).toMatchObject({ ok: true, selectedPixelCount: 418_876 });
    expect(applied).toEqual({
      fileName: "marv-kalani-logo-zauberstab.png",
      ok: true,
      selectedPixelCount: 418_876,
    });
    expect(applicationServices.previewMagicWandSelection).toHaveBeenCalledWith({
      sensitivityPercent: 15,
      source: "original",
      x: 0.01,
      y: 0.01,
    });
    expect(applicationServices.applyMagicWandSelection).toHaveBeenCalledOnce();
  });

  test("Given an original is loaded, when comparison A selects it, then the visible source and workspace state use the typed original", async () => {
    const applicationServices = services();
    applicationServices.assignOriginalComparison = vi.fn(() => true);
    applicationServices.readComparedRuns = () =>
      Object.freeze({
        a: originalSource({
          file: new File([], "circle.png", { type: "image/png" }),
          metadata: {
            fileName: "circle.png",
            heightPixels: 256,
            mimeType: "image/png",
            previewUrl: "blob:circle",
            sizeBytes: 0,
            widthPixels: 256,
          },
          version: { id: 1, kind: ImageVersionKind.Original },
        }),
      });
    const tools = createStudioTools(applicationServices);

    const selectionResult = JSON.parse(await tools[3]!.execute({ original: true }));
    const workspace = JSON.parse(await tools[0]!.execute({}));

    expect(selectionResult).toEqual({ ok: true, slot: "a", source: "original" });
    expect(applicationServices.assignOriginalComparison).toHaveBeenCalledWith("a");
    expect(workspace.comparison).toEqual({ a: "original" });
  });

  test("Given a processed raster is loaded, when comparison B selects it, then WebMCP exposes the processed source", async () => {
    const applicationServices = services();
    applicationServices.assignProcessedComparison = vi.fn(() => true);
    applicationServices.readComparedRuns = () =>
      Object.freeze({
        b: processedSource({
          file: new File([], "edited.png", { type: "image/png" }),
          metadata: {
            fileName: "edited.png",
            heightPixels: 256,
            mimeType: "image/png",
            previewUrl: "blob:edited",
            sizeBytes: 0,
            widthPixels: 256,
          },
          version: { id: 2, kind: ImageVersionKind.ManualResult },
        }),
      });
    const tools = createStudioTools(applicationServices);

    const selectionResult = JSON.parse(await tools[4]!.execute({ processed: true }));
    const workspace = JSON.parse(await tools[0]!.execute({}));

    expect(selectionResult).toEqual({ ok: true, slot: "b", source: "processed" });
    expect(applicationServices.assignProcessedComparison).toHaveBeenCalledWith("b");
    expect(workspace.comparison).toEqual({ b: "processed" });
  });

  test("Given a History run, when delete_history_run executes, then it delegates the exact session ID", async () => {
    const applicationServices = services();
    applicationServices.removeRun = vi.fn(() => true);
    const tool = createStudioTools(applicationServices).find(
      (candidate) => candidate.name === "delete_history_run",
    )!;

    const output = JSON.parse(await tool.execute({ runId: 4 }));

    expect(output).toEqual({ deletedRunId: 4, ok: true });
    expect(applicationServices.removeRun).toHaveBeenCalledWith(4);
  });
});

function services(): StudioToolServices {
  return {
    applyMagicWandSelection: vi.fn(),
    applySmartSelection: vi.fn(),
    assignComparison: vi.fn(),
    assignOriginalComparison: vi.fn(() => false),
    assignProcessedComparison: vi.fn(() => false),
    downloadSelectedSvg: vi.fn(() => false),
    loadModel: vi.fn(),
    readComparedRuns: () => Object.freeze({}),
    readImage: () => undefined,
    readModels: () => [],
    readOptions: () => ({ ...defaultConversionOptions }),
    readRuns: () => [],
    previewMagicWandSelection: vi.fn(),
    removeRun: vi.fn(),
    removeBackground: vi.fn(),
    retryModel: vi.fn(),
    selectRun: vi.fn(),
    unloadModel: vi.fn(),
  };
}
