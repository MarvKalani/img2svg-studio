import type { RasterPixels } from "../conversion/read-raster-pixels";
import type { BrowserExecutionBackend } from "./model-manifest";
import type { LoadedBrowserModel } from "./model-registry";
import type { SamSelectionMask, SamSelectionPoint } from "./sam-selection";

export interface SamSelectionSession {
  dispose(): Promise<void>;
  predict(points: readonly SamSelectionPoint[]): Promise<SamSelectionMask>;
}

export interface SamRuntime {
  createSelection(input: RasterPixels): Promise<SamSelectionSession>;
  dispose(): Promise<void>;
}

export interface LoadedSamModel extends LoadedBrowserModel {
  readonly modelId: "slimsam";
  createSelection(input: RasterPixels): Promise<SamSelectionSession>;
}

export function createSamAdapter(
  backend: BrowserExecutionBackend,
  runtime: SamRuntime,
): LoadedSamModel {
  const activeSelections = new Set<() => Promise<void>>();
  let unloading = false;
  let disposal: Promise<void> | undefined;

  const createSelection = async (input: RasterPixels): Promise<SamSelectionSession> => {
    if (unloading) {
      throw new Error("SlimSAM wird entladen.");
    }
    const session = await runtime.createSelection(input);
    let sessionDisposal: Promise<void> | undefined;
    const dispose = (): Promise<void> => {
      sessionDisposal ??= Promise.resolve()
        .then(() => session.dispose())
        .finally(() => activeSelections.delete(dispose));
      return sessionDisposal;
    };
    activeSelections.add(dispose);
    return Object.freeze({ dispose, predict: session.predict });
  };

  return Object.freeze({
    backend,
    createSelection,
    dispose: () => {
      unloading = true;
      disposal ??= Promise.allSettled([...activeSelections].map((dispose) => dispose()))
        .then(() => runtime.dispose())
        .catch((error: unknown) => {
          disposal = undefined;
          throw error;
        });
      return disposal;
    },
    modelId: "slimsam" as const,
  });
}

export function isLoadedSamModel(model: LoadedBrowserModel): model is LoadedSamModel {
  return model.modelId === "slimsam" && "createSelection" in model;
}
