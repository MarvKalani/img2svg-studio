import { describe, expect, test } from "vitest";
import { defaultConversionOptions } from "../conversion/conversion-options";
import type { ConversionRun } from "../history/history-store";
import { ImageVersionKind } from "../image/image-version";
import { compareSourceSettings } from "./compare-source-settings";
import { draftSource, originalSource, processedSource, runSource } from "./comparison-source";

describe("original comparison settings", () => {
  test("Given the raster original and one run, when differences are requested, then source and all conversion parameters stay explicit", () => {
    const rows = compareSourceSettings(
      originalSource({
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
      runSource(run()),
      true,
    );

    expect(rows).toHaveLength(23);
    expect(rows[0]).toEqual({
      a: "Original · V1",
      b: "Run 1 · Original · V1",
      key: "source",
      label: "Quelle",
    });
    expect(rows[6]).toEqual({
      a: "—",
      b: "6 Bit",
      key: "colorPrecision",
      label: "Farbpräzision",
    });
  });

  test("Given the raster original and an unsaved draft, when compared, then the draft exposes the same conversion settings as a run", () => {
    const conversion = run();
    const { id: _id, ...draft } = conversion;
    const rows = compareSourceSettings(originalSource(original()), draftSource(draft), true);

    expect(rows[0]).toEqual({
      a: "Original · V1",
      b: "Entwurf · Original · V1",
      key: "source",
      label: "Quelle",
    });
    expect(rows).toHaveLength(23);
  });

  test("Given original and processed rasters, when compared, then their versioned sources stay explicit without conversion parameters", () => {
    const processed = {
      ...original(),
      version: { id: 2, kind: ImageVersionKind.ManualResult },
    } as const;

    expect(
      compareSourceSettings(originalSource(original()), processedSource(processed), true),
    ).toEqual([
      {
        a: "Original · V1",
        b: "Verarbeitet · Bearbeitet · V2",
        key: "source",
        label: "Quelle",
      },
    ]);
  });
});

function original() {
  return {
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
  } as const;
}

function run(): ConversionRun {
  return {
    circleCount: 0,
    durationMilliseconds: 1,
    ellipseCount: 0,
    fileName: "circle.png",
    heightPixels: 256,
    id: 1,
    inputVersion: { id: 1, kind: ImageVersionKind.Original },
    lineCount: 0,
    options: defaultConversionOptions,
    pathCount: 1,
    polygonCount: 0,
    rectangleCount: 0,
    svg: "<svg></svg>",
    widthPixels: 256,
  };
}
