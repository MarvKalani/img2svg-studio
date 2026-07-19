import type {
  ConversionWorkerRequest,
  ConversionWorkerResponse,
} from "./conversion-worker-contract";
import { readRasterPixels } from "./read-raster-pixels";

export async function convertImage(file: File): Promise<string> {
  const raster = await readRasterPixels(file);
  const request: ConversionWorkerRequest = {
    heightPixels: raster.heightPixels,
    rgbaBuffer: raster.rgba.buffer,
    widthPixels: raster.widthPixels,
  };

  return runWorker(request);
}

function runWorker(request: ConversionWorkerRequest): Promise<string> {
  const worker = new Worker(new URL("./conversion-worker.ts", import.meta.url), { type: "module" });

  return new Promise((resolve, reject) => {
    worker.addEventListener(
      "message",
      (event: MessageEvent<ConversionWorkerResponse>) => {
        worker.terminate();
        if (event.data.ok) {
          resolve(event.data.svg);
        } else {
          reject(new Error(event.data.error));
        }
      },
      { once: true },
    );
    worker.addEventListener(
      "error",
      () => {
        worker.terminate();
        reject(new Error("Der Konvertierungs-Worker ist fehlgeschlagen."));
      },
      { once: true },
    );
    worker.postMessage(request, [request.rgbaBuffer]);
  });
}
