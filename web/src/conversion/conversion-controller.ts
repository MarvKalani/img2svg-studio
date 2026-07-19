import type { ImageStore } from "../image/image-store";
import { convertImage } from "./conversion-service";

export function initializeConversion(imageStore: ImageStore): void {
  const elements = readConversionElements();

  elements.button.addEventListener("click", () => {
    const loadedImage = imageStore.current();
    if (!loadedImage) {
      return;
    }

    void runConversion(elements, loadedImage.file);
  });
}

interface ConversionElements {
  button: HTMLButtonElement;
  buttonLabel: HTMLElement;
  error: HTMLParagraphElement;
  output: HTMLElement;
  rasterPreview: HTMLImageElement;
  statusImage: HTMLElement;
}

async function runConversion(elements: ConversionElements, file: File): Promise<void> {
  elements.button.disabled = true;
  elements.buttonLabel.textContent = "Konvertiere …";
  elements.error.hidden = true;
  elements.statusImage.textContent = "Konvertierung läuft lokal …";

  try {
    const svg = await convertImage(file);
    elements.output.replaceChildren(parseSvg(svg));
    elements.rasterPreview.hidden = true;
    elements.output.hidden = false;
    elements.statusImage.textContent = "Konvertierung abgeschlossen · SVG lokal erzeugt";
  } catch {
    elements.error.textContent = "Die Konvertierung ist fehlgeschlagen. Bitte versuche es erneut.";
    elements.error.hidden = false;
    elements.statusImage.textContent = "Konvertierung fehlgeschlagen";
  } finally {
    elements.button.disabled = false;
    elements.buttonLabel.textContent = "Konvertieren";
  }
}

function parseSvg(svg: string): Element {
  const parsedDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsedDocument.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new Error("Die Engine hat kein gültiges SVG erzeugt.");
  }
  return document.importNode(root, true);
}

function readConversionElements(): ConversionElements {
  return {
    button: requireElement("#convert-button", HTMLButtonElement),
    buttonLabel: requireElement("#convert-button-label", HTMLElement),
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
