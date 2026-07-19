import { describe, expect, test } from "vitest";
import { defaultConversionOptions } from "../conversion/conversion-options";
import type { ConversionRun } from "../history/history-store";
import { ImageVersionKind } from "../image/image-version";
import { compareRunSettings } from "./compare-run-settings";

describe("run settings comparison", () => {
  test("Given original and AI inputs with equal conversion options, when differences are requested, then only the input version differs", () => {
    const original = run(1, ImageVersionKind.Original);
    const aiResult = run(2, ImageVersionKind.AiResult);

    expect(compareRunSettings(original, aiResult, true)).toEqual([
      { a: "Original · V1", b: "KI-Ergebnis · V2", key: "inputVersion", label: "Eingabe" },
    ]);
  });
});

function run(inputVersionId: number, inputVersionKind: ImageVersionKind): ConversionRun {
  return {
    circleCount: 0,
    durationMilliseconds: 1,
    ellipseCount: 0,
    fileName: "portrait.png",
    heightPixels: 256,
    id: inputVersionId,
    inputVersion: { id: inputVersionId, kind: inputVersionKind },
    lineCount: 0,
    options: defaultConversionOptions,
    pathCount: 1,
    polygonCount: 0,
    rectangleCount: 0,
    svg: "<svg></svg>",
    widthPixels: 256,
  };
}
