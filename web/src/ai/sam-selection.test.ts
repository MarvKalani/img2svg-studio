import { describe, expect, it, vi } from "vitest";
import type { RasterPixels } from "../conversion/read-raster-pixels";
import { createSamAdapter, type SamRuntime } from "./sam-adapter";
import {
  applySelectionMask,
  createSamPoint,
  MaskPolarity,
  SamPointKind,
  type SamSelectionMask,
} from "./sam-selection";

describe("SAM selection", () => {
  it("Given two positive and one negative point, when captured, then typed pixel positions remain bounded", () => {
    const bounds = { heightPixels: 4, widthPixels: 4 };

    const points = [
      createSamPoint({ kind: SamPointKind.Positive, xPixels: 1.2, yPixels: 2.8 }, bounds),
      createSamPoint({ kind: SamPointKind.Positive, xPixels: 8, yPixels: 1 }, bounds),
      createSamPoint({ kind: SamPointKind.Negative, xPixels: -1, yPixels: 0 }, bounds),
    ];

    expect(points).toEqual([
      { kind: "positive", xPixels: 1, yPixels: 3 },
      { kind: "positive", xPixels: 3, yPixels: 1 },
      { kind: "negative", xPixels: 0, yPixels: 0 },
    ]);
  });

  it("Given an updated SAM mask, when applied or inverted, then original RGB and source alpha are preserved", () => {
    const input: RasterPixels = {
      heightPixels: 2,
      rgba: new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 128, 100, 110, 120, 64]),
      widthPixels: 2,
    };
    const mask: SamSelectionMask = {
      heightPixels: 2,
      selected: new Uint8Array([1, 0, 1, 0]),
      widthPixels: 2,
    };

    const applied = applySelectionMask(input, mask, MaskPolarity.Selected);
    const inverted = applySelectionMask(input, mask, MaskPolarity.Inverted);

    expect([...applied.rgba]).toEqual([
      10, 20, 30, 255, 40, 50, 60, 0, 70, 80, 90, 128, 100, 110, 120, 0,
    ]);
    expect([...inverted.rgba]).toEqual([
      10, 20, 30, 0, 40, 50, 60, 255, 70, 80, 90, 0, 100, 110, 120, 64,
    ]);
    expect([...input.rgba]).toEqual([
      10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 128, 100, 110, 120, 64,
    ]);
  });

  it("Given a mask with different dimensions, when applied, then it is rejected", () => {
    const input: RasterPixels = {
      heightPixels: 1,
      rgba: new Uint8Array([10, 20, 30, 255]),
      widthPixels: 1,
    };
    const mask: SamSelectionMask = {
      heightPixels: 2,
      selected: new Uint8Array([1, 0]),
      widthPixels: 1,
    };

    expect(() => applySelectionMask(input, mask, MaskPolarity.Selected)).toThrow(
      "Die SAM-Maske passt nicht zum Eingabebild.",
    );
  });

  it("Given an active embedding session, when the model unloads twice, then owned resources close once", async () => {
    const mask: SamSelectionMask = {
      heightPixels: 1,
      selected: new Uint8Array([1]),
      widthPixels: 1,
    };
    const disposeSelection = vi.fn(async () => undefined);
    const predict = vi.fn(async () => mask);
    const disposeRuntime = vi.fn(async () => undefined);
    const runtime: SamRuntime = {
      createSelection: vi.fn(async () => ({ dispose: disposeSelection, predict })),
      dispose: disposeRuntime,
    };
    const model = createSamAdapter("webgpu", runtime);
    const input: RasterPixels = {
      heightPixels: 1,
      rgba: new Uint8Array([10, 20, 30, 255]),
      widthPixels: 1,
    };
    const selection = await model.createSelection(input);
    const point = createSamPoint({ kind: SamPointKind.Positive, xPixels: 0, yPixels: 0 }, input);

    await expect(selection.predict([point])).resolves.toBe(mask);
    await Promise.all([model.dispose(), model.dispose()]);

    expect(predict).toHaveBeenCalledWith([point]);
    expect(disposeSelection).toHaveBeenCalledOnce();
    expect(disposeRuntime).toHaveBeenCalledOnce();
    await expect(model.createSelection(input)).rejects.toThrow("SlimSAM wird entladen.");
  });
});
