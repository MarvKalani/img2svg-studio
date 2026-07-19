import type {
  ConversionWorkerRequest,
  ConversionWorkerResponse,
} from "./conversion-worker-contract";
import { ConversionFailure, ConversionFailureCode } from "./conversion-failure";
import type { ConversionOptions } from "./conversion-options";
import { readRasterPixels } from "./read-raster-pixels";

export async function convertImage(file: File, options: ConversionOptions): Promise<string> {
  const raster = await readRasterPixels(file);
  const request: ConversionWorkerRequest = {
    heightPixels: raster.heightPixels,
    options,
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
          reject(new ConversionFailure(event.data.failureCode));
        }
      },
      { once: true },
    );
    worker.addEventListener(
      "error",
      () => {
        worker.terminate();
        reject(new ConversionFailure(ConversionFailureCode.WorkerFailed));
      },
      { once: true },
    );
    worker.postMessage(request, [request.rgbaBuffer]);
  });
}
