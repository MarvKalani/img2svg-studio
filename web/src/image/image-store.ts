import type { DecodedImage } from "./decode-image";

export interface LoadedImage {
  file: File;
  metadata: DecodedImage;
}

export interface ImageStore {
  current(): LoadedImage | undefined;
  dispose(): void;
  replace(file: File, metadata: DecodedImage): void;
}

export function createImageStore(
  revokePreviewUrl: (previewUrl: string) => void = URL.revokeObjectURL,
): ImageStore {
  let loadedImage: LoadedImage | undefined;

  return {
    current: () => loadedImage,
    dispose: () => {
      if (loadedImage) {
        revokePreviewUrl(loadedImage.metadata.previewUrl);
        loadedImage = undefined;
      }
    },
    replace: (file, metadata) => {
      if (loadedImage) {
        revokePreviewUrl(loadedImage.metadata.previewUrl);
      }
      loadedImage = { file, metadata };
    },
  };
}
