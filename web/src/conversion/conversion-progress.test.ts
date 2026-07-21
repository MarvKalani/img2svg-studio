import { describe, expect, test } from "vitest";
import {
  ConversionProgressPhase,
  presentConversionProgress,
  readConversionProgressPhase,
} from "./conversion-progress";

describe("conversion progress", () => {
  test("presents native clustering progress without inventing an end-to-end percentage", () => {
    expect(
      presentConversionProgress({
        completed: 42,
        phase: ConversionProgressPhase.Clustering,
        total: 100,
      }),
    ).toEqual({ detail: "42 %", label: "Farbflächen erkennen", maximum: 100, value: 42 });
  });

  test("presents exact processed and total tracing areas", () => {
    expect(
      presentConversionProgress({
        completed: 23,
        phase: ConversionProgressPhase.Tracing,
        total: 542,
      }),
    ).toEqual({
      detail: "23 / 542 Farbflächen",
      label: "SVG-Konturen erzeugen",
      maximum: 542,
      value: 23,
    });
  });

  test("accepts only progress phases defined by the worker contract", () => {
    expect(readConversionProgressPhase("cutout-clustering")).toBe(
      ConversionProgressPhase.CutoutClustering,
    );
    expect(readConversionProgressPhase("estimating")).toBeUndefined();
  });
});
