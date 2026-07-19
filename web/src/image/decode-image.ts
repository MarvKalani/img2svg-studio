export const ImageLoadErrorCode = {
  DecodeFailed: "decode-failed",
  FileTooLarge: "file-too-large",
  UnsupportedFormat: "unsupported-format",
} as const;

export type ImageLoadErrorCode = (typeof ImageLoadErrorCode)[keyof typeof ImageLoadErrorCode];

export const SupportedImageMimeType = {
  Jpeg: "image/jpeg",
  Png: "image/png",
  Webp: "image/webp",
} as const;

export type SupportedImageMimeType =
  (typeof SupportedImageMimeType)[keyof typeof SupportedImageMimeType];

export interface DecodedImage {
  fileName: string;
  heightPixels: number;
  mimeType: SupportedImageMimeType;
  previewUrl: string;
  sizeBytes: number;
  widthPixels: number;
}

export interface ImageDecodePorts {
  createPreviewUrl(file: ImageFileInput): string;
  decodeBitmap(file: ImageFileInput): Promise<DecodedBitmap>;
}

export interface ImageFileInput {
  name: string;
  size: number;
  type: string;
}

interface DecodedBitmap {
  close(): void;
  height: number;
  width: number;
}

interface ImageLoadError {
  code: ImageLoadErrorCode;
  message: string;
}

export type DecodeImageResult =
  | { image: DecodedImage; ok: true }
  | { error: ImageLoadError; ok: false };

const maximumImageBytes = 25 * 1024 * 1024;

const browserImageDecodePorts: ImageDecodePorts = {
  createPreviewUrl: (file) => URL.createObjectURL(requireBlob(file)),
  decodeBitmap: (file) => createImageBitmap(requireBlob(file)),
};

export async function decodeImage(
  file: ImageFileInput,
  ports: ImageDecodePorts = browserImageDecodePorts,
): Promise<DecodeImageResult> {
  const mimeType = parseSupportedMimeType(file.type);
  if (!mimeType) {
    return failure(
      ImageLoadErrorCode.UnsupportedFormat,
      "Bitte wähle ein PNG-, JPEG- oder WebP-Bild.",
    );
  }

  if (file.size > maximumImageBytes) {
    return failure(
      ImageLoadErrorCode.FileTooLarge,
      "Das Bild ist größer als 25 MB. Bitte wähle eine kleinere Datei.",
    );
  }

  try {
    const bitmap = await ports.decodeBitmap(file);
    try {
      if (bitmap.width < 1 || bitmap.height < 1) {
        return failure(
          ImageLoadErrorCode.DecodeFailed,
          "Das Bild ist beschädigt oder kann nicht gelesen werden.",
        );
      }

      return {
        image: {
          fileName: file.name,
          heightPixels: bitmap.height,
          mimeType,
          previewUrl: ports.createPreviewUrl(file),
          sizeBytes: file.size,
          widthPixels: bitmap.width,
        },
        ok: true,
      };
    } finally {
      bitmap.close();
    }
  } catch {
    return failure(
      ImageLoadErrorCode.DecodeFailed,
      "Das Bild ist beschädigt oder kann nicht gelesen werden.",
    );
  }
}

function parseSupportedMimeType(mimeType: string): SupportedImageMimeType | undefined {
  return Object.values(SupportedImageMimeType).find((supportedType) => supportedType === mimeType);
}

function failure(code: ImageLoadErrorCode, message: string): DecodeImageResult {
  return { error: { code, message }, ok: false };
}

function requireBlob(file: ImageFileInput): Blob {
  if (!(file instanceof Blob)) {
    throw new TypeError("Browser image decoding requires a Blob.");
  }
  return file;
}
