import type { RasterPixels } from "../conversion/read-raster-pixels";

export async function encodeRasterPng(pixels: RasterPixels, fileName: string): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.widthPixels;
  canvas.height = pixels.heightPixels;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Der Browser konnte das KI-Ergebnis nicht als PNG speichern.");
  }
  context.putImageData(
    new ImageData(new Uint8ClampedArray(pixels.rgba), pixels.widthPixels, pixels.heightPixels),
    0,
    0,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Der Browser konnte das KI-Ergebnis nicht als PNG speichern."));
      }
    }, "image/png");
  });
  return new File([blob], fileName, { type: "image/png" });
}
