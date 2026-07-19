import { describe, expect, it, vi } from "vitest";
import type { RasterPixels } from "../conversion/read-raster-pixels";
import { browserModelManifest, totalModelBytes } from "./model-manifest";
import { applyAlphaMatte, createModnetAdapter, type ModnetSession } from "./modnet-adapter";
import { createDownloadProgressReporter } from "./modnet-model-loader";
import type { ModelLoadUpdate } from "./model-registry";

describe("MODNet adapter", () => {
  it("Given RGBA pixels and a matte, when background removal runs, then RGB stays unchanged and alpha is multiplied", async () => {
    const input: RasterPixels = {
      heightPixels: 2,
      rgba: new Uint8Array([10, 20, 30, 255, 40, 50, 60, 128, 70, 80, 90, 200, 100, 110, 120, 64]),
      widthPixels: 2,
    };
    const session: ModnetSession = {
      dispose: vi.fn(async () => undefined),
      predictAlpha: vi.fn(async () => new Float32Array([0, 0.25, 0.5, 2])),
    };
    const adapter = createModnetAdapter("webgpu", session);

    const result = await adapter.removeBackground(input);

    expect(result).toEqual({
      heightPixels: 2,
      rgba: new Uint8Array([10, 20, 30, 0, 40, 50, 60, 32, 70, 80, 90, 100, 100, 110, 120, 64]),
      widthPixels: 2,
    });
    expect(session.predictAlpha).toHaveBeenCalledWith(input);

    await adapter.dispose();
    expect(session.dispose).toHaveBeenCalledOnce();
  });

  it("Given a matte with the wrong size, when it is applied, then the adapter rejects it", () => {
    const input: RasterPixels = {
      heightPixels: 1,
      rgba: new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]),
      widthPixels: 2,
    };

    expect(() => applyAlphaMatte(input, new Float32Array([1]))).toThrow(
      "Die MODNet-Maske passt nicht zum Eingabebild.",
    );
  });

  it("Given pinned artifacts, when download events arrive, then byte progress uses only their real loaded bytes", () => {
    const model = browserModelManifest.find((candidate) => candidate.id === "modnet")!;
    const updates: ModelLoadUpdate[] = [];
    const reportProgress = createDownloadProgressReporter(model, (update) => {
      updates.push(update);
    });

    reportProgress({ file: "config.json", loaded: 40, status: "progress" });
    reportProgress({ file: "unlisted.json", loaded: 500, status: "progress" });
    reportProgress({ file: "config.json", loaded: 20, status: "progress" });
    reportProgress({ file: "config.json", status: "done" });
    reportProgress({ file: "preprocessor_config.json", status: "done" });
    reportProgress({ file: "onnx/model.onnx", status: "done" });

    expect(updates).toEqual([
      { downloadedBytes: 40, phase: "downloading" },
      { downloadedBytes: 40, phase: "downloading" },
      { downloadedBytes: 83, phase: "downloading" },
      { downloadedBytes: 448, phase: "downloading" },
      { downloadedBytes: totalModelBytes(model), phase: "downloading" },
    ]);
  });
});
