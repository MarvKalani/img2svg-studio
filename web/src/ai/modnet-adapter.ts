import type { RasterPixels } from "../conversion/read-raster-pixels";
import type { BrowserExecutionBackend } from "./model-manifest";
import type { LoadedBrowserModel } from "./model-registry";

export interface ModnetSession {
  dispose(): Promise<void>;
  predictAlpha(input: RasterPixels): Promise<Float32Array<ArrayBuffer>>;
}

export interface LoadedModnetModel extends LoadedBrowserModel {
  readonly modelId: "modnet";
  removeBackground(input: RasterPixels): Promise<RasterPixels>;
}

export function createModnetAdapter(
  backend: BrowserExecutionBackend,
  session: ModnetSession,
): LoadedModnetModel {
  let disposal: Promise<void> | undefined;
  return Object.freeze({
    backend,
    dispose: () => {
      disposal ??= Promise.resolve()
        .then(() => session.dispose())
        .catch((error: unknown) => {
          // A failed close still owns resources, so a later retry must reach the session again.
          disposal = undefined;
          throw error;
        });
      return disposal;
    },
    modelId: "modnet" as const,
    removeBackground: async (input: RasterPixels) =>
      applyAlphaMatte(input, await session.predictAlpha(input)),
  });
}

export function applyAlphaMatte(
  input: RasterPixels,
  alphaMatte: Float32Array<ArrayBuffer>,
): RasterPixels {
  const expectedPixelCount = input.widthPixels * input.heightPixels;
  if (alphaMatte.length !== expectedPixelCount || input.rgba.length !== expectedPixelCount * 4) {
    throw new Error("Die MODNet-Maske passt nicht zum Eingabebild.");
  }

  const result = new Uint8Array(input.rgba);
  for (let pixelIndex = 0; pixelIndex < expectedPixelCount; pixelIndex += 1) {
    const alphaIndex = pixelIndex * 4 + 3;
    const matteAlpha = Math.min(Math.max(alphaMatte[pixelIndex] ?? 0, 0), 1);
    result[alphaIndex] = Math.round((input.rgba[alphaIndex] ?? 0) * matteAlpha);
  }
  return {
    heightPixels: input.heightPixels,
    rgba: result,
    widthPixels: input.widthPixels,
  };
}

export function isLoadedModnetModel(model: LoadedBrowserModel): model is LoadedModnetModel {
  return model.modelId === "modnet" && "removeBackground" in model;
}
