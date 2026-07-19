import type { ImageStore } from "../image/image-store";

export function initializeSvgDownload(imageStore: ImageStore): void {
  const button = requireElement("#download-svg", HTMLButtonElement);
  const output = requireElement("#svg-output", HTMLElement);

  button.addEventListener("click", () => {
    const svg = output.querySelector("svg");
    const loadedImage = imageStore.current();
    if (!svg || !loadedImage) {
      return;
    }

    downloadSvg(svg, svgFileName(loadedImage.file.name));
  });
}

function downloadSvg(svg: SVGElement, fileName: string): void {
  const bytes = new XMLSerializer().serializeToString(svg);
  const downloadUrl = URL.createObjectURL(new Blob([bytes], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.download = fileName;
  link.href = downloadUrl;
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

function svgFileName(sourceFileName: string): string {
  const nameWithoutExtension = sourceFileName.replace(/\.[^.]+$/u, "");
  return `${nameWithoutExtension || "conversion"}.svg`;
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
