import { SupportedImageMimeType, decodeImage, type DecodedImage } from "./decode-image";
import type { ImageStore, LoadedImage } from "./image-store";
import { formatImageVersion, ImageVersionKind } from "./image-version";

export interface ImageLoaderController {
  loadAiVersion(file: File): Promise<boolean>;
  loadManualVersion(file: File): Promise<boolean>;
  loadLogoDemo(): Promise<boolean>;
  loadOriginal(file: File): Promise<boolean>;
  loadTopographyDemo(): Promise<boolean>;
  reportError(message: string): void;
  restoreOriginal(): boolean;
  showCurrentImage(): boolean;
}

interface BundledDemo {
  readonly errorMessage: string;
  readonly fileName: string;
  readonly mimeType: SupportedImageMimeType;
  readonly url: URL;
}

const bundledLogo: BundledDemo = Object.freeze({
  errorMessage: "Das Logo-Demo konnte nicht geladen werden.",
  fileName: "marv-kalani-logo.jpg",
  mimeType: SupportedImageMimeType.Jpeg,
  url: new URL("../../../fixtures/demo/marv-kalani-logo.jpg", import.meta.url),
});
const bundledTopography: BundledDemo = Object.freeze({
  errorMessage: "Das Topografie-Demo konnte nicht geladen werden.",
  fileName: "topography-island.png",
  mimeType: SupportedImageMimeType.Png,
  url: new URL("../../../fixtures/demo/topography-island.png", import.meta.url),
});

export function initializeImageLoader(
  imageStore: ImageStore,
  onImageLoaded: (image: DecodedImage) => void,
  onLogoDemoLoaded: () => void,
  onTopographyDemoLoaded: () => void,
): ImageLoaderController {
  const elements = readImageLoaderElements();

  const loadImage = async (file: File, kind: ImageVersionKind): Promise<boolean> => {
    const result = await decodeImage(file);
    if (!result.ok) {
      showImageError(elements, result.error.message);
      return false;
    }

    const loadedImage = loadIntoStore(imageStore, file, result.image, kind);
    onImageLoaded(result.image);
    showLoadedImage(elements, loadedImage);
    return true;
  };

  const loadOriginal = (file: File): Promise<boolean> => loadImage(file, ImageVersionKind.Original);
  const loadAiVersion = (file: File): Promise<boolean> =>
    loadImage(file, ImageVersionKind.AiResult);
  const loadManualVersion = (file: File): Promise<boolean> =>
    loadImage(file, ImageVersionKind.ManualResult);
  const reportError = (message: string): void => showImageError(elements, message);
  const loadBundledDemo = async (demo: BundledDemo): Promise<boolean> => {
    try {
      const response = await fetch(demo.url);
      if (!response.ok) throw new Error(`Demo request failed: ${String(response.status)}.`);
      return loadOriginal(
        new File([await response.blob()], demo.fileName, { type: demo.mimeType }),
      );
    } catch {
      showImageError(elements, demo.errorMessage);
      return false;
    }
  };
  const loadLogoDemo = async (): Promise<boolean> => {
    const loaded = await loadBundledDemo(bundledLogo);
    if (loaded) onLogoDemoLoaded();
    return loaded;
  };
  const loadTopographyDemo = async (): Promise<boolean> => {
    const loaded = await loadBundledDemo(bundledTopography);
    if (loaded) onTopographyDemoLoaded();
    return loaded;
  };
  const restoreOriginal = (): boolean => {
    const original = imageStore.restoreOriginal();
    if (!original) {
      return false;
    }
    onImageLoaded(original.metadata);
    showLoadedImage(elements, original);
    return true;
  };
  const showCurrentImage = (): boolean => {
    const current = imageStore.current();
    if (!current) {
      return false;
    }
    showLoadedImage(elements, current);
    return true;
  };

  elements.selectButton.addEventListener("click", () => elements.fileInput.click());
  elements.logoDemoButton.addEventListener("click", () => void loadLogoDemo());
  elements.topographyDemoButton.addEventListener("click", () => void loadTopographyDemo());
  elements.fileInput.addEventListener("change", () => {
    const selectedFile = elements.fileInput.files?.item(0);
    if (selectedFile) {
      void loadOriginal(selectedFile);
    }
  });

  elements.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("drag-active");
  });
  elements.dropzone.addEventListener("dragleave", () => {
    elements.dropzone.classList.remove("drag-active");
  });
  elements.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("drag-active");
    const droppedFile = event.dataTransfer?.files.item(0);
    if (droppedFile) {
      void loadOriginal(droppedFile);
    }
  });
  elements.restoreOriginal.addEventListener("click", restoreOriginal);

  window.addEventListener("beforeunload", () => imageStore.dispose());
  return Object.freeze({
    loadAiVersion,
    loadManualVersion,
    loadLogoDemo,
    loadOriginal,
    loadTopographyDemo,
    reportError,
    restoreOriginal,
    showCurrentImage,
  });
}

function loadIntoStore(
  imageStore: ImageStore,
  file: File,
  metadata: DecodedImage,
  kind: ImageVersionKind,
): LoadedImage {
  switch (kind) {
    case ImageVersionKind.AiResult:
      return imageStore.appendAiVersion(file, metadata);
    case ImageVersionKind.ManualResult:
      return imageStore.appendManualVersion(file, metadata);
    case ImageVersionKind.Original:
      return imageStore.replaceOriginal(file, metadata);
  }
}

interface ImageLoaderElements {
  downloadButton: HTMLButtonElement;
  dropzone: HTMLElement;
  error: HTMLParagraphElement;
  fileInput: HTMLInputElement;
  logoDemoButton: HTMLButtonElement;
  topographyDemoButton: HTMLButtonElement;
  sourceIcon: HTMLElement;
  sourceMetadata: HTMLElement;
  sourceName: HTMLElement;
  sourceThumbnail: HTMLImageElement;
  selectButton: HTMLButtonElement;
  restoreOriginal: HTMLButtonElement;
  statusImage: HTMLElement;
  svgOutput: HTMLElement;
  workspaceImage: HTMLImageElement;
  workspacePlaceholder: HTMLElement;
}

function readImageLoaderElements(): ImageLoaderElements {
  return {
    downloadButton: requireElement("#download-svg", HTMLButtonElement),
    dropzone: requireElement("[data-testid='image-dropzone']", HTMLElement),
    error: requireElement("#image-error", HTMLParagraphElement),
    fileInput: requireElement("#image-input", HTMLInputElement),
    logoDemoButton: requireElement("#load-logo-demo", HTMLButtonElement),
    topographyDemoButton: requireElement("#load-topography-demo", HTMLButtonElement),
    sourceIcon: requireElement("#source-icon", HTMLElement),
    sourceMetadata: requireElement("#source-metadata", HTMLElement),
    sourceName: requireElement("#source-name", HTMLElement),
    sourceThumbnail: requireElement("#source-thumbnail", HTMLImageElement),
    selectButton: requireElement("#image-select-button", HTMLButtonElement),
    restoreOriginal: requireElement("#restore-original-image", HTMLButtonElement),
    statusImage: requireElement("#status-image", HTMLElement),
    svgOutput: requireElement("#svg-output", HTMLElement),
    workspaceImage: requireElement("#workspace-raster-preview", HTMLImageElement),
    workspacePlaceholder: requireElement("#workspace-empty", HTMLElement),
  };
}

function showLoadedImage(elements: ImageLoaderElements, loadedImage: LoadedImage): void {
  const image = loadedImage.metadata;
  const dimensions = `${String(image.widthPixels)} × ${String(image.heightPixels)}`;
  const format = formatLabel(image.mimeType);

  elements.error.hidden = true;
  elements.error.textContent = "";
  elements.sourceIcon.hidden = true;
  elements.sourceThumbnail.src = image.previewUrl;
  elements.sourceThumbnail.alt = `Vorschau von ${image.fileName}`;
  elements.sourceThumbnail.hidden = false;
  elements.sourceName.textContent = image.fileName;
  elements.sourceMetadata.textContent = `${dimensions} · ${format} · ${formatImageVersion(loadedImage.version)}`;
  elements.restoreOriginal.hidden = loadedImage.version.kind === ImageVersionKind.Original;
  elements.workspacePlaceholder.hidden = true;
  elements.downloadButton.hidden = true;
  delete elements.downloadButton.dataset.sourceFileName;
  elements.svgOutput.replaceChildren();
  elements.svgOutput.hidden = true;
  elements.workspaceImage.src = image.previewUrl;
  elements.workspaceImage.alt = `Geladenes Rasterbild ${image.fileName}`;
  elements.workspaceImage.hidden = false;
  elements.statusImage.textContent = `${dimensions} · ${format}`;
}

function showImageError(elements: ImageLoaderElements, message: string): void {
  elements.error.textContent = message;
  elements.error.hidden = false;
  elements.fileInput.value = "";
}

function formatLabel(mimeType: SupportedImageMimeType): string {
  const formatLabels: Record<SupportedImageMimeType, string> = {
    [SupportedImageMimeType.Jpeg]: "JPEG",
    [SupportedImageMimeType.Png]: "PNG",
    [SupportedImageMimeType.Webp]: "WebP",
  };
  return formatLabels[mimeType];
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
