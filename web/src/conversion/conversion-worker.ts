import initializeWasm, { convert_rgba_with_progress } from "../wasm-pkg/img2svg_wasm";
import { readEngineFailureCode } from "./conversion-failure";
import { CurveFittingMode, HierarchicalMode } from "./conversion-options";
import { shapeDetectionFlags } from "./shape-options";
import { readConversionProgressPhase } from "./conversion-progress";
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
    const svg = convert_rgba_with_progress(
      new Uint8Array(request.rgbaBuffer),
      request.widthPixels,
      request.heightPixels,
      request.options.colorPrecision,
      request.options.filterSpeckle,
      request.options.pathPrecision,
      hierarchicalModeCode(request.options.hierarchical),
      curveFittingModeCode(request.options.curveFitting),
      request.options.layerDifference,
      request.options.cornerThreshold,
      Math.round(request.options.lengthThreshold * 10),
      request.options.maxIterations,
      request.options.spliceThreshold,
      request.options.scalePercent,
      shapeDetectionFlags(request.options.shapeDetection),
      (phase: string, completed: number, total: number) => {
        const typedPhase = readConversionProgressPhase(phase);
        if (!typedPhase || !validProgressAmount(completed) || !validProgressAmount(total)) {
          return;
        }
        workerScope.postMessage({
          progress: { completed, phase: typedPhase, total },
        });
      },
    );
    workerScope.postMessage({ ok: true, svg });
  } catch (error) {
    workerScope.postMessage({
      failureCode: readEngineFailureCode(error),
      ok: false,
    });
  }
}

function validProgressAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function curveFittingModeCode(mode: CurveFittingMode): number {
  switch (mode) {
    case CurveFittingMode.Pixel:
      return 0;
    case CurveFittingMode.Polygon:
      return 1;
    case CurveFittingMode.Spline:
      return 2;
  }
}

function hierarchicalModeCode(mode: HierarchicalMode): number {
  return mode === HierarchicalMode.Stacked ? 0 : 1;
}
