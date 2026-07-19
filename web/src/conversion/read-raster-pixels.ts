export interface RasterPixels {
  heightPixels: number;
  rgba: Uint8Array<ArrayBuffer>;
  widthPixels: number;
}

export async function readRasterPixels(file: File): Promise<RasterPixels> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Der Browser konnte das Bild nicht für die Konvertierung öffnen.");
    }

    context.drawImage(bitmap, 0, 0);
    const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return {
      heightPixels: bitmap.height,
      rgba: new Uint8Array(imageData.data),
      widthPixels: bitmap.width,
    };
  } finally {
    bitmap.close();
  }
}
