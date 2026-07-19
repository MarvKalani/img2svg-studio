import { SupportedImageMimeType, decodeImage, type DecodedImage } from "./decode-image";

export function initializeImageLoader(): void {
  const elements = readImageLoaderElements();
  let activePreviewUrl: string | undefined;

  const loadImage = async (file: File): Promise<void> => {
    const result = await decodeImage(file);
    if (!result.ok) {
      showImageError(elements, result.error.message);
      return;
    }

    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
    }
    activePreviewUrl = result.image.previewUrl;
    showDecodedImage(elements, result.image);
  };

  elements.selectButton.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", () => {
    const selectedFile = elements.fileInput.files?.item(0);
    if (selectedFile) {
      void loadImage(selectedFile);
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
      void loadImage(droppedFile);
    }
  });

  window.addEventListener("beforeunload", () => {
    if (activePreviewUrl) {
      URL.revokeObjectURL(activePreviewUrl);
    }
  });
}

interface ImageLoaderElements {
  convertButton: HTMLButtonElement;
  dropzone: HTMLElement;
  error: HTMLParagraphElement;
  fileInput: HTMLInputElement;
  sourceIcon: HTMLElement;
  sourceMetadata: HTMLElement;
  sourceName: HTMLElement;
  sourceThumbnail: HTMLImageElement;
  selectButton: HTMLButtonElement;
  statusImage: HTMLElement;
  workspaceImage: HTMLImageElement;
  workspacePlaceholder: HTMLElement;
}

function readImageLoaderElements(): ImageLoaderElements {
  return {
    convertButton: requireElement("#convert-button", HTMLButtonElement),
    dropzone: requireElement("[data-testid='image-dropzone']", HTMLElement),
    error: requireElement("#image-error", HTMLParagraphElement),
    fileInput: requireElement("#image-input", HTMLInputElement),
    sourceIcon: requireElement("#source-icon", HTMLElement),
    sourceMetadata: requireElement("#source-metadata", HTMLElement),
    sourceName: requireElement("#source-name", HTMLElement),
    sourceThumbnail: requireElement("#source-thumbnail", HTMLImageElement),
    selectButton: requireElement("#image-select-button", HTMLButtonElement),
    statusImage: requireElement("#status-image", HTMLElement),
    workspaceImage: requireElement("#workspace-raster-preview", HTMLImageElement),
    workspacePlaceholder: requireElement("#workspace-empty", HTMLElement),
  };
}

function showDecodedImage(elements: ImageLoaderElements, image: DecodedImage): void {
  const dimensions = `${String(image.widthPixels)} × ${String(image.heightPixels)}`;
  const format = formatLabel(image.mimeType);

  elements.error.hidden = true;
  elements.error.textContent = "";
  elements.sourceIcon.hidden = true;
  elements.sourceThumbnail.src = image.previewUrl;
  elements.sourceThumbnail.alt = `Vorschau von ${image.fileName}`;
  elements.sourceThumbnail.hidden = false;
  elements.sourceName.textContent = image.fileName;
  elements.sourceMetadata.textContent = `${dimensions} · ${format}`;
  elements.workspacePlaceholder.hidden = true;
  elements.workspaceImage.src = image.previewUrl;
  elements.workspaceImage.alt = `Geladenes Rasterbild ${image.fileName}`;
  elements.workspaceImage.hidden = false;
  elements.convertButton.disabled = false;
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
