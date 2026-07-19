import { describe, expect, test, vi } from "vitest";
import { MaskPolarity } from "../ai/sam-selection";
import { defaultConversionOptions } from "../conversion/conversion-options";
import { createStudioTools, type StudioToolServices } from "./studio-tools";

describe("complete Studio WebMCP tools", () => {
  test("Given the application services, when tools are created, then every advertised visible command has one stable tool", () => {
    const tools = createStudioTools(services());

    const toolNames = tools.map((tool) => tool.name);
    expect(toolNames).toEqual([
      "get_workspace_state",
      "select_history_run",
      "select_comparison_a",
      "select_comparison_b",
      "download_selected_svg",
      "load_model",
      "retry_model",
      "unload_model",
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
});

function services(): StudioToolServices {
  return {
    applySmartSelection: vi.fn(),
    assignComparison: vi.fn(),
    downloadSelectedSvg: vi.fn(() => false),
    loadModel: vi.fn(),
    readComparedRuns: () => Object.freeze({}),
    readImage: () => undefined,
    readModels: () => [],
    readOptions: () => ({ ...defaultConversionOptions }),
    readRuns: () => [],
    removeBackground: vi.fn(),
    retryModel: vi.fn(),
    selectRun: vi.fn(),
    unloadModel: vi.fn(),
  };
}
