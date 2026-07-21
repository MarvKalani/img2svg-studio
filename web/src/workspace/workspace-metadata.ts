import { formatByteSize, utf8ByteLength } from "../format-byte-size";
import type { NewConversionRun } from "../history/history-store";
import { formatImageVersion } from "../image/image-version";
import type { LoadedImage } from "../image/image-store";

export interface WorkspaceMetadataController {
  showImage(image: LoadedImage): void;
  showVector(run: Readonly<NewConversionRun>): void;
}

export function initializeWorkspaceMetadata(): WorkspaceMetadataController {
  const elements = readElements();

  const show = (metadata: {
    readonly dimensions: string;
    readonly duration: string;
    readonly elements: string;
    readonly fileSize: string;
    readonly source: string;
    readonly summary: string;
  }): void => {
    elements.container.hidden = false;
    elements.summary.textContent = metadata.summary;
    elements.fileSize.textContent = metadata.fileSize;
    elements.dimensions.textContent = metadata.dimensions;
    elements.elements.textContent = metadata.elements;
    elements.duration.textContent = metadata.duration;
    elements.source.textContent = metadata.source;
  };

  return Object.freeze({
    showImage: (image: LoadedImage) => {
      const fileSize = formatByteSize(image.metadata.sizeBytes);
      show({
        dimensions: `${String(image.metadata.widthPixels)} × ${String(image.metadata.heightPixels)} px`,
        duration: "—",
        elements: "Rasterbild",
        fileSize,
        source: `${image.metadata.mimeType} · ${formatImageVersion(image.version)}`,
        summary: `Raster · ${fileSize}`,
      });
    },
    showVector: (run: Readonly<NewConversionRun>) => {
      const fileSize = formatByteSize(utf8ByteLength(run.svg));
      show({
        dimensions: `${String(run.widthPixels)} × ${String(run.heightPixels)} px`,
        duration: `${String(run.durationMilliseconds)} ms`,
        elements: vectorElements(run),
        fileSize,
        source: `${run.fileName} · ${formatImageVersion(run.inputVersion)}`,
        summary: `SVG · ${fileSize}`,
      });
    },
  });
}

function vectorElements(run: Readonly<NewConversionRun>): string {
  const values = [`${String(run.pathCount)} ${run.pathCount === 1 ? "Pfad" : "Pfade"}`];
  const shapes = [
    [run.circleCount, "Kreise"],
    [run.rectangleCount, "Rechtecke"],
    [run.ellipseCount, "Ellipsen"],
    [run.lineCount, "Linien"],
    [run.polygonCount, "Polygone"],
  ] as const;
  for (const [count, label] of shapes) {
    if (count > 0) values.push(`${String(count)} ${label}`);
  }
  return values.join(" · ");
}

function readElements(): {
  container: HTMLDetailsElement;
  dimensions: HTMLElement;
  duration: HTMLElement;
  elements: HTMLElement;
  fileSize: HTMLElement;
  source: HTMLElement;
  summary: HTMLElement;
} {
  return {
    container: requireElement("#workspace-metadata", HTMLDetailsElement),
    dimensions: requireElement("#workspace-dimensions", HTMLElement),
    duration: requireElement("#workspace-duration", HTMLElement),
    elements: requireElement("#workspace-elements", HTMLElement),
    fileSize: requireElement("#workspace-file-size", HTMLElement),
    source: requireElement("#workspace-source", HTMLElement),
    summary: requireElement("#workspace-metadata-summary", HTMLElement),
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
  if (!(element instanceof constructor)) throw new Error(`Required metadata element: ${selector}`);
  return element;
}
