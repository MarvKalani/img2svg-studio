import initializeWasm, { convert_rgba } from "../wasm-pkg/img2svg_wasm";
import { readEngineFailureCode } from "./conversion-failure";
import { shapeDetectionFlags } from "./shape-options";
import type {
  ConversionWorkerRequest,
  ConversionWorkerResponse,
} from "./conversion-worker-contract";

interface WorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ConversionWorkerRequest>) => void,
  ): void;
  postMessage(response: ConversionWorkerResponse): void;
}

const workerScope = globalThis as unknown as WorkerScope;

workerScope.addEventListener("message", (event) => {
  void convertInWorker(event.data);
});

async function convertInWorker(request: ConversionWorkerRequest): Promise<void> {
  try {
    await initializeWasm();
    const svg = convert_rgba(
      new Uint8Array(request.rgbaBuffer),
      request.widthPixels,
      request.heightPixels,
      request.options.colorPrecision,
      request.options.filterSpeckle,
      request.options.scalePercent,
      shapeDetectionFlags(request.options.shapeDetection),
    );
    workerScope.postMessage({ ok: true, svg });
  } catch (error) {
    workerScope.postMessage({
      failureCode: readEngineFailureCode(error),
      ok: false,
    });
  }
}
