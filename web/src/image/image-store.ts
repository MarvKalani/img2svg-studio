import type { DecodedImage } from "./decode-image";
import { ImageVersionKind, type ImageVersion } from "./image-version";

export interface LoadedImage {
  readonly file: File;
  readonly metadata: DecodedImage;
  readonly version: ImageVersion;
}

export interface ImageStore {
  appendAiVersion(file: File, metadata: DecodedImage): LoadedImage;
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

  const releaseCurrentAiPreview = (): void => {
    if (currentImage && currentImage !== originalImage) {
      revokePreviewUrl(currentImage.metadata.previewUrl);
    }
  };

  return {
    appendAiVersion: (file, metadata) => {
      if (!originalImage) {
        throw new Error("An AI image version requires an original image.");
      }
      releaseCurrentAiPreview();
      currentImage = createVersion(file, metadata, ImageVersionKind.AiResult);
      return currentImage;
    },
    current: () => currentImage,
    dispose: () => {
      releaseCurrentAiPreview();
      if (originalImage) {
        revokePreviewUrl(originalImage.metadata.previewUrl);
      }
      currentImage = undefined;
      originalImage = undefined;
    },
    original: () => originalImage,
    replaceOriginal: (file, metadata) => {
      releaseCurrentAiPreview();
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
      releaseCurrentAiPreview();
      currentImage = originalImage;
      return currentImage;
    },
  };
}
