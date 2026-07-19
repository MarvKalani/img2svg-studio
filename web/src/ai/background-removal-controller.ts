import { readRasterPixels, type RasterPixels } from "../conversion/read-raster-pixels";
import type { ImageLoaderController } from "../image/image-loader";
import type { ImageStore } from "../image/image-store";
import { isLoadedModnetModel } from "./modnet-adapter";
import type { ModelRegistry } from "./model-registry";

export interface BackgroundRemovalController {
  imageLoaded(): void;
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

  const removeBackground = async (): Promise<void> => {
    const source = imageStore.current();
    if (!source || processing) {
      return;
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
      const resultFile = await encodePng(result, resultFileName(source.file.name));
      if (!(await imageLoader.load(resultFile))) {
        throw new Error("Das freigestellte PNG konnte nicht angezeigt werden.");
      }
      status.textContent = `Hintergrund lokal entfernt · ${backendLabel(loaded.state.backend)}`;
    } catch (error) {
      status.textContent = errorMessage(error);
    } finally {
      processing = false;
      button.disabled = imageStore.current() === undefined;
      button.removeAttribute("aria-busy");
    }
  };

  return Object.freeze({ imageLoaded });
}

async function encodePng(pixels: RasterPixels, fileName: string): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.widthPixels;
  canvas.height = pixels.heightPixels;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Der Browser konnte das KI-Ergebnis nicht als PNG speichern.");
  }
  context.putImageData(
    new ImageData(new Uint8ClampedArray(pixels.rgba), pixels.widthPixels, pixels.heightPixels),
    0,
    0,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Der Browser konnte das KI-Ergebnis nicht als PNG speichern."));
      }
    }, "image/png");
  });
  return new File([blob], fileName, { type: "image/png" });
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
