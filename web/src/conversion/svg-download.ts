export interface SvgDownloadController {
  download(): boolean;
}

export function initializeSvgDownload(): SvgDownloadController {
  const button = requireElement("#download-svg", HTMLButtonElement);
  const output = requireElement("#svg-output", HTMLElement);

  const download = (): boolean => {
    const svg = output.querySelector("svg");
    const sourceFileName = button.dataset.sourceFileName;
    if (!svg || !sourceFileName) {
      return false;
    }

    downloadSvgFile({
      bytes: new XMLSerializer().serializeToString(svg),
      fileName: svgFileName(sourceFileName),
    });
    return true;
  };
  button.addEventListener("click", download);
  return Object.freeze({ download });
}

export interface SvgDownloadFile {
  bytes: string;
  fileName: string;
}

export function downloadSvgFile(file: SvgDownloadFile): void {
  const downloadUrl = URL.createObjectURL(new Blob([file.bytes], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.download = file.fileName;
  link.href = downloadUrl;
  link.click();
  URL.revokeObjectURL(downloadUrl);
}

export function svgFileName(sourceFileName: string): string {
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
