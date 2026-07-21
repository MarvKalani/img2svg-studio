import type { ConversionRun, NewConversionRun } from "../history/history-store";
import type { ImageStore, LoadedImage } from "../image/image-store";
import { toConversionFailure } from "./conversion-failure";
import type { ConversionOptions } from "./conversion-options";
import { convertImage } from "./conversion-service";
import { parseSvgDocument, readSvgMetrics } from "./svg-document";

export const ConversionAttemptCode = {
  ConversionFailed: "conversion-failed",
  NoImage: "no-image",
} as const;

export type ConversionAttempt =
  | { readonly ok: true; readonly run: ConversionRun }
  | {
      readonly code: (typeof ConversionAttemptCode)[keyof typeof ConversionAttemptCode];
      readonly message: string;
      readonly ok: false;
    };

export interface ConversionController {
  convert(): Promise<ConversionAttempt>;
  requestPreview(): void;
}

export interface ConversionControllerActions {
  recordRun(run: NewConversionRun): ConversionRun;
  showPreview(run: NewConversionRun): void;
}

interface PreviewResult {
  renderedSvg: Element;
  run: NewConversionRun;
}

const previewDelayMilliseconds = 120;

export function initializeConversion(
  imageStore: ImageStore,
  readOptions: () => ConversionOptions,
  actions: ConversionControllerActions,
): ConversionController {
  const elements = readConversionElements();
  let requestedRevision = 0;
  let previewTimer: number | undefined;
  let activePreview: Promise<void> | undefined;
  let activeRevision: number | undefined;
  let currentPreview: NewConversionRun | undefined;

  const refreshPreview = async (): Promise<void> => {
    if (previewTimer !== undefined) {
      window.clearTimeout(previewTimer);
      previewTimer = undefined;
    }
    if (activePreview) {
      const runningRevision = activeRevision;
      await activePreview;
      if (runningRevision !== requestedRevision && imageStore.current()) {
        await refreshPreview();
      }
      return;
    }

    const loadedImage = imageStore.current();
    if (!loadedImage) {
      showNoImage(elements);
      return;
    }

    const revision = requestedRevision;
    const options = readOptions();
    activeRevision = revision;
    activePreview = createPreview(loadedImage, options)
      .then((preview) => {
        if (revision !== requestedRevision) {
          return;
        }
        currentPreview = preview.run;
        showPreview(elements, preview);
        actions.showPreview(preview.run);
      })
      .catch((error: unknown) => {
        if (revision !== requestedRevision) {
          return;
        }
        showPreviewFailure(elements, error);
      })
      .finally(() => {
        activePreview = undefined;
        activeRevision = undefined;
      });
    await activePreview;

    if (revision !== requestedRevision) {
      await refreshPreview();
    }
  };

  const requestPreview = (): void => {
    requestedRevision += 1;
    currentPreview = undefined;
    if (!imageStore.current()) {
      showNoImage(elements);
      return;
    }
    showPendingPreview(elements);
    if (previewTimer !== undefined) {
      window.clearTimeout(previewTimer);
    }
    previewTimer = window.setTimeout(() => {
      previewTimer = undefined;
      void refreshPreview();
    }, previewDelayMilliseconds);
  };

  const convert = async (): Promise<ConversionAttempt> => {
    if (!imageStore.current()) {
      return noImageAttempt();
    }
    if (!currentPreview) {
      await refreshPreview();
    }
    if (!currentPreview) {
      return {
        code: ConversionAttemptCode.ConversionFailed,
        message: elements.error.textContent || "Die Vorschau konnte nicht erstellt werden.",
        ok: false,
      };
    }

    const run = actions.recordRun(currentPreview);
    elements.button.disabled = true;
    elements.buttonLabel.textContent = "Im Verlauf gespeichert";
    elements.statusImage.textContent = `Variante ${String(run.id)} übernommen · ${previewMetricsStatus(currentPreview)}`;
    return { ok: true, run };
  };

  elements.button.addEventListener("click", () => {
    void convert();
  });
  return Object.freeze({ convert, requestPreview });
}

async function createPreview(
  loadedImage: LoadedImage,
  options: ConversionOptions,
): Promise<PreviewResult> {
  const startedAtMilliseconds = Date.now();
  const svg = await convertImage(loadedImage.file, options);
  const renderedSvg = parseSvgDocument(svg);
  const metrics = readSvgMetrics(renderedSvg);
  return {
    renderedSvg,
    run: {
      durationMilliseconds: Math.max(0, Date.now() - startedAtMilliseconds),
      fileName: loadedImage.file.name,
      inputVersion: loadedImage.version,
      ...metrics,
      options,
      svg,
    },
  };
}

function showPendingPreview(elements: ConversionElements): void {
  elements.button.disabled = true;
  elements.buttonLabel.textContent = "Vorschau wird aktualisiert …";
  elements.error.hidden = true;
  elements.statusImage.textContent = "Vorschau wird lokal aktualisiert …";
}

function showPreview(elements: ConversionElements, preview: PreviewResult): void {
  elements.output.replaceChildren(preview.renderedSvg);
  elements.rasterPreview.hidden = true;
  elements.output.hidden = false;
  elements.downloadButton.hidden = false;
  elements.downloadButton.dataset.sourceFileName = preview.run.fileName;
  elements.error.hidden = true;
  elements.statusImage.textContent = previewStatus(preview.run);
  elements.button.disabled = false;
  elements.buttonLabel.textContent = "Variante übernehmen";
}

function showPreviewFailure(elements: ConversionElements, error: unknown): void {
  const failure = toConversionFailure(error);
  elements.error.textContent = failure.message;
  elements.error.hidden = false;
  elements.statusImage.textContent = "Vorschau fehlgeschlagen";
  elements.button.disabled = true;
  elements.buttonLabel.textContent = "Variante übernehmen";
}

function showNoImage(elements: ConversionElements): void {
  elements.button.disabled = true;
  elements.buttonLabel.textContent = "Variante übernehmen";
}

function noImageAttempt(): ConversionAttempt {
  return {
    code: ConversionAttemptCode.NoImage,
    message: "Es ist kein Eingabebild geladen.",
    ok: false,
  };
}

function previewStatus(run: NewConversionRun): string {
  return `Vorschau bereit · ${previewMetricsStatus(run)}`;
}

function previewMetricsStatus(run: NewConversionRun): string {
  const nativeShapes = [];
  if (run.circleCount > 0) {
    nativeShapes.push(`${String(run.circleCount)} ${run.circleCount === 1 ? "Kreis" : "Kreise"}`);
  }
  if (run.rectangleCount > 0) {
    nativeShapes.push(
      `${String(run.rectangleCount)} ${run.rectangleCount === 1 ? "Rechteck" : "Rechtecke"}`,
    );
  }
  if (run.ellipseCount > 0) {
    nativeShapes.push(
      `${String(run.ellipseCount)} ${run.ellipseCount === 1 ? "Ellipse" : "Ellipsen"}`,
    );
  }
  if (run.lineCount > 0) {
    nativeShapes.push(`${String(run.lineCount)} ${run.lineCount === 1 ? "Linie" : "Linien"}`);
  }
  if (run.polygonCount > 0) {
    nativeShapes.push(
      `${String(run.polygonCount)} ${run.polygonCount === 1 ? "Polygon" : "Polygone"}`,
    );
  }
  const nativeShapeStatus = nativeShapes.length > 0 ? ` · ${nativeShapes.join(" · ")}` : "";
  return `${String(run.pathCount)} ${run.pathCount === 1 ? "Pfad" : "Pfade"}${nativeShapeStatus}`;
}

interface ConversionElements {
  button: HTMLButtonElement;
  buttonLabel: HTMLElement;
  downloadButton: HTMLButtonElement;
  error: HTMLParagraphElement;
  output: HTMLElement;
  rasterPreview: HTMLImageElement;
  statusImage: HTMLElement;
}

function readConversionElements(): ConversionElements {
  return {
    button: requireElement("#convert-button", HTMLButtonElement),
    buttonLabel: requireElement("#convert-button-label", HTMLElement),
    downloadButton: requireElement("#download-svg", HTMLButtonElement),
    error: requireElement("#image-error", HTMLParagraphElement),
    output: requireElement("#svg-output", HTMLElement),
    rasterPreview: requireElement("#workspace-raster-preview", HTMLImageElement),
    statusImage: requireElement("#status-image", HTMLElement),
  };
}

interface ElementConstructor<ElementType extends Element> {
  new (): ElementType;
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: ElementConstructor<ElementType>,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required element is missing: ${selector}`);
  }
  return element;
}
