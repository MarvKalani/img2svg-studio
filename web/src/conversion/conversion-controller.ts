import type { ImageStore, LoadedImage } from "../image/image-store";
import type { ConversionRun, NewConversionRun } from "../history/history-store";
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
}

export function initializeConversion(
  imageStore: ImageStore,
  readOptions: () => ConversionOptions,
  recordRun: (run: NewConversionRun) => ConversionRun,
): ConversionController {
  const elements = readConversionElements();
  let activeConversion: Promise<ConversionAttempt> | undefined;

  const convert = (): Promise<ConversionAttempt> => {
    const loadedImage = imageStore.current();
    if (!loadedImage) {
      return Promise.resolve({
        code: ConversionAttemptCode.NoImage,
        message: "Es ist kein Eingabebild geladen.",
        ok: false,
      });
    }
    if (activeConversion) {
      return activeConversion;
    }
    activeConversion = runConversion(elements, loadedImage, readOptions, recordRun).finally(() => {
      activeConversion = undefined;
    });
    return activeConversion;
  };

  elements.button.addEventListener("click", () => {
    void convert();
  });
  return Object.freeze({ convert });
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

async function runConversion(
  elements: ConversionElements,
  loadedImage: LoadedImage,
  readOptions: () => ConversionOptions,
  recordRun: (run: NewConversionRun) => ConversionRun,
): Promise<ConversionAttempt> {
  const { file } = loadedImage;
  elements.button.disabled = true;
  elements.buttonLabel.textContent = "Konvertiere …";
  elements.error.hidden = true;
  elements.statusImage.textContent = "Konvertierung läuft lokal …";

  try {
    const options = readOptions();
    const startedAtMilliseconds = Date.now();
    const svg = await convertImage(file, options);
    const renderedSvg = parseSvgDocument(svg);
    const metrics = readSvgMetrics(renderedSvg);
    elements.output.replaceChildren(renderedSvg);
    elements.rasterPreview.hidden = true;
    elements.output.hidden = false;
    elements.downloadButton.hidden = false;
    elements.downloadButton.dataset.sourceFileName = file.name;
    elements.statusImage.textContent = completedStatus(
      metrics.circleCount,
      metrics.ellipseCount,
      metrics.lineCount,
      metrics.polygonCount,
      metrics.rectangleCount,
    );
    const run = recordRun({
      durationMilliseconds: Math.max(0, Date.now() - startedAtMilliseconds),
      fileName: file.name,
      inputVersion: loadedImage.version,
      ...metrics,
      options,
      svg,
    });
    return { ok: true, run };
  } catch (error) {
    const failure = toConversionFailure(error);
    elements.error.textContent = failure.message;
    elements.error.hidden = false;
    elements.statusImage.textContent = "Konvertierung fehlgeschlagen";
    return {
      code: ConversionAttemptCode.ConversionFailed,
      message: failure.message,
      ok: false,
    };
  } finally {
    elements.button.disabled = false;
    elements.buttonLabel.textContent = "Konvertieren";
  }
}

function completedStatus(
  circleCount: number,
  ellipseCount: number,
  lineCount: number,
  polygonCount: number,
  rectangleCount: number,
): string {
  const nativeShapes = [];
  if (circleCount > 0) {
    nativeShapes.push(`${String(circleCount)} ${circleCount === 1 ? "Kreis" : "Kreise"}`);
  }
  if (rectangleCount > 0) {
    nativeShapes.push(
      `${String(rectangleCount)} ${rectangleCount === 1 ? "Rechteck" : "Rechtecke"}`,
    );
  }
  if (ellipseCount > 0) {
    nativeShapes.push(`${String(ellipseCount)} ${ellipseCount === 1 ? "Ellipse" : "Ellipsen"}`);
  }
  if (lineCount > 0) {
    nativeShapes.push(`${String(lineCount)} ${lineCount === 1 ? "Linie" : "Linien"}`);
  }
  if (polygonCount > 0) {
    nativeShapes.push(`${String(polygonCount)} ${polygonCount === 1 ? "Polygon" : "Polygone"}`);
  }
  const nativeShapeStatus = nativeShapes.length > 0 ? ` · ${nativeShapes.join(" · ")}` : "";
  return `Konvertierung abgeschlossen · SVG lokal erzeugt${nativeShapeStatus}`;
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
