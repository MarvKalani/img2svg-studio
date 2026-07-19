import { readRasterPixels } from "../conversion/read-raster-pixels";
import type { ImageLoaderController } from "../image/image-loader";
import type { ImageStore } from "../image/image-store";
import { encodeRasterPng } from "./encode-raster-png";
import { isLoadedModnetModel } from "./modnet-adapter";
import type { ModelRegistry } from "./model-registry";
import type { AiActionResult } from "./ai-action-result";

export interface BackgroundRemovalController {
  imageLoaded(): void;
  removeBackground(): Promise<AiActionResult>;
}

export function initializeBackgroundRemoval(
  imageStore: ImageStore,
  imageLoader: ImageLoaderController,
  registry: ModelRegistry,
): BackgroundRemovalController {
  const button = requireElement("#remove-background", HTMLButtonElement);
  const status = requireElement("#background-removal-status", HTMLOutputElement);
  let processing = false;

  const imageLoaded = (): void => {
    if (!processing) {
      button.disabled = false;
    }
  };

  button.addEventListener("click", () => {
    void removeBackground();
  });

  async function removeBackground(): Promise<AiActionResult> {
    const source = imageStore.current();
    if (!source) {
      return { message: "Es ist kein Eingabebild geladen.", ok: false };
    }
    if (processing) {
      return { message: "Die Hintergrundentfernung läuft bereits.", ok: false };
    }
    processing = true;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    status.textContent = "MODNet wird lokal vorbereitet …";

    try {
      const beforeLoad = registry.snapshot("modnet");
      const loaded =
        beforeLoad.state.status === "error"
          ? await registry.retry("modnet")
          : await registry.load("modnet");
      if (loaded.state.status !== "ready") {
        throw new Error(
          loaded.state.status === "error"
            ? loaded.state.message
            : "MODNet wurde nicht vollständig geladen.",
        );
      }

      status.textContent = `Hintergrund wird lokal entfernt · ${backendLabel(loaded.state.backend)} …`;
      const result = await registry.withLoadedModel("modnet", async (model) => {
        if (!isLoadedModnetModel(model)) {
          throw new Error("Das geladene Modell unterstützt keine Hintergrundentfernung.");
        }
        return model.removeBackground(await readRasterPixels(source.file));
      });
      if (imageStore.current() !== source) {
        throw new Error("Das Eingabebild wurde während der Hintergrundentfernung gewechselt.");
      }
      const resultFile = await encodeRasterPng(result, resultFileName(source.file.name));
      if (!(await imageLoader.loadAiVersion(resultFile))) {
        throw new Error("Das freigestellte PNG konnte nicht angezeigt werden.");
      }
      status.textContent = `Hintergrund lokal entfernt · ${backendLabel(loaded.state.backend)}`;
      return { fileName: resultFile.name, ok: true };
    } catch (error) {
      const message = errorMessage(error);
      status.textContent = message;
      return { message, ok: false };
    } finally {
      processing = false;
      button.disabled = imageStore.current() === undefined;
      button.removeAttribute("aria-busy");
    }
  }

  return Object.freeze({ imageLoaded, removeBackground });
}

function resultFileName(sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/, "") || "bild";
  return `${baseName}-freigestellt.png`;
}

function backendLabel(backend: "wasm" | "webgpu"): string {
  return backend === "webgpu" ? "WebGPU" : "WASM";
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Der Hintergrund konnte nicht entfernt werden.";
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: new () => ElementType,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required background-removal element is missing: ${selector}`);
  }
  return element;
}
