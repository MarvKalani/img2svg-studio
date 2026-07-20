import {
  applyRasterFilter,
  defaultRasterPreprocessingOptions,
  preprocessedDimensions,
  type RasterPreprocessingOptions,
} from "./raster-preprocessing";

export interface RasterPixels {
  heightPixels: number;
  rgba: Uint8Array<ArrayBuffer>;
  widthPixels: number;
}

export async function readRasterPixels(
  file: File,
  options: RasterPreprocessingOptions = defaultRasterPreprocessingOptions,
): Promise<RasterPixels> {
  const bitmap = await createImageBitmap(file);
  try {
    const dimensions = preprocessedDimensions(bitmap.width, bitmap.height, options);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.widthPixels;
    canvas.height = dimensions.heightPixels;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Der Browser konnte das Bild nicht für die Konvertierung öffnen.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, dimensions.widthPixels, dimensions.heightPixels);
    const imageData = context.getImageData(0, 0, dimensions.widthPixels, dimensions.heightPixels);
    return {
      ...dimensions,
      rgba: applyRasterFilter(new Uint8Array(imageData.data), options),
    };
  } finally {
    bitmap.close();
  }
}
