import type {
  ConversionWorkerRequest,
  ConversionWorkerResponse,
} from "./conversion-worker-contract";
import { ConversionFailure, ConversionFailureCode } from "./conversion-failure";
import type { ConversionOptions } from "./conversion-options";
import type { ConversionProgressUpdate } from "./conversion-progress";
import { readRasterPixels } from "./read-raster-pixels";

export async function convertImage(
  file: File,
  options: ConversionOptions,
  reportProgress: (progress: ConversionProgressUpdate) => void,
  signal: AbortSignal,
): Promise<string> {
  throwIfCancelled(signal);
  const raster = await readRasterPixels(file, options.preprocessing);
  throwIfCancelled(signal);
  const request: ConversionWorkerRequest = {
    heightPixels: raster.heightPixels,
    options,
    rgbaBuffer: raster.rgba.buffer,
    widthPixels: raster.widthPixels,
  };

  return runConversionWorker(request, reportProgress, signal);
}

export interface ConversionWorkerPort {
  addEventListener(
    type: "error" | "message",
    listener: (event: ErrorEvent | MessageEvent<ConversionWorkerResponse>) => void,
    options?: AddEventListenerOptions,
  ): void;
  postMessage(request: ConversionWorkerRequest, transfer: readonly Transferable[]): void;
  terminate(): void;
}

export function runConversionWorker(
  request: ConversionWorkerRequest,
  reportProgress: (progress: ConversionProgressUpdate) => void,
  signal: AbortSignal,
  createWorker: () => ConversionWorkerPort = browserWorker,
): Promise<string> {
  const worker = createWorker();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (complete: () => void): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", cancel);
      worker.terminate();
      complete();
    };
    const cancel = (): void => {
      finish(() => reject(new ConversionFailure(ConversionFailureCode.Cancelled)));
    };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) {
      cancel();
      return;
    }

    worker.addEventListener("message", (event) => {
      if (!(event instanceof MessageEvent)) return;
      const response = event.data as ConversionWorkerResponse;
      if ("progress" in response) {
        reportProgress(response.progress);
        return;
      }
      if (response.ok) {
        finish(() => resolve(response.svg));
      } else {
        finish(() => reject(new ConversionFailure(response.failureCode)));
      }
    });
    worker.addEventListener(
      "error",
      () => {
        finish(() => reject(new ConversionFailure(ConversionFailureCode.WorkerFailed)));
      },
      { once: true },
    );
    worker.postMessage(request, [request.rgbaBuffer]);
  });
}

function browserWorker(): ConversionWorkerPort {
  return new Worker(new URL("./conversion-worker.ts", import.meta.url), {
    type: "module",
  }) as ConversionWorkerPort;
}

function throwIfCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new ConversionFailure(ConversionFailureCode.Cancelled);
  }
}
