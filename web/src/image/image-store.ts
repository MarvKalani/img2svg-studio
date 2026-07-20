import type { DecodedImage } from "./decode-image";
import { ImageVersionKind, type ImageVersion } from "./image-version";

export interface LoadedImage {
  readonly file: File;
  readonly metadata: DecodedImage;
  readonly version: ImageVersion;
}

export interface ImageStore {
  appendAiVersion(file: File, metadata: DecodedImage): LoadedImage;
  appendManualVersion(file: File, metadata: DecodedImage): LoadedImage;
  current(): LoadedImage | undefined;
  dispose(): void;
  original(): LoadedImage | undefined;
  replaceOriginal(file: File, metadata: DecodedImage): LoadedImage;
  restoreOriginal(): LoadedImage | undefined;
}

export function createImageStore(
  revokePreviewUrl: (previewUrl: string) => void = URL.revokeObjectURL,
): ImageStore {
  let currentImage: LoadedImage | undefined;
  let originalImage: LoadedImage | undefined;
  let nextVersionId = 1;

  const createVersion = (file: File, metadata: DecodedImage, kind: ImageVersionKind): LoadedImage =>
    Object.freeze({
      file,
      metadata,
      version: Object.freeze({ id: nextVersionId++, kind }),
    });

  const releaseCurrentDerivedPreview = (): void => {
    if (currentImage && currentImage !== originalImage) {
      revokePreviewUrl(currentImage.metadata.previewUrl);
    }
  };

  const appendDerivedVersion = (
    file: File,
    metadata: DecodedImage,
    kind: typeof ImageVersionKind.AiResult | typeof ImageVersionKind.ManualResult,
  ): LoadedImage => {
    if (!originalImage) {
      throw new Error("A derived image version requires an original image.");
    }
    releaseCurrentDerivedPreview();
    currentImage = createVersion(file, metadata, kind);
    return currentImage;
  };

  return {
    appendAiVersion: (file, metadata) =>
      appendDerivedVersion(file, metadata, ImageVersionKind.AiResult),
    appendManualVersion: (file, metadata) =>
      appendDerivedVersion(file, metadata, ImageVersionKind.ManualResult),
    current: () => currentImage,
    dispose: () => {
      releaseCurrentDerivedPreview();
      if (originalImage) {
        revokePreviewUrl(originalImage.metadata.previewUrl);
      }
      currentImage = undefined;
      originalImage = undefined;
    },
    original: () => originalImage,
    replaceOriginal: (file, metadata) => {
      releaseCurrentDerivedPreview();
      if (originalImage) {
        revokePreviewUrl(originalImage.metadata.previewUrl);
      }
      originalImage = createVersion(file, metadata, ImageVersionKind.Original);
      currentImage = originalImage;
      return originalImage;
    },
    restoreOriginal: () => {
      if (!originalImage) {
        return undefined;
      }
      releaseCurrentDerivedPreview();
      currentImage = originalImage;
      return currentImage;
    },
  };
}
