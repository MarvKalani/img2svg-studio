import initializeWasm, { convert_rgba } from "../wasm-pkg/img2svg_wasm";
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
    );
    workerScope.postMessage({ ok: true, svg });
  } catch (error) {
    workerScope.postMessage({
      error: error instanceof Error ? error.message : "Unbekannter Enginefehler",
      ok: false,
    });
  }
}
