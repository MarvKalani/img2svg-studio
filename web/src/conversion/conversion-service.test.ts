import { describe, expect, test, vi } from "vitest";
import { ConversionFailureCode } from "./conversion-failure";
import { runConversionWorker, type ConversionWorkerPort } from "./conversion-service";
import { defaultConversionOptions } from "./conversion-options";

describe("conversion worker lifecycle", () => {
  test("Given an active conversion, when it is cancelled, then its worker terminates and reports a typed cancellation", async () => {
    const terminate = vi.fn();
    const worker = fakeWorker(terminate);
    const abortController = new AbortController();
    const result = runConversionWorker(
      {
        heightPixels: 1,
        options: defaultConversionOptions,
        rgbaBuffer: new ArrayBuffer(4),
        widthPixels: 1,
      },
      vi.fn(),
      abortController.signal,
      () => worker,
    );

    abortController.abort();

    await expect(result).rejects.toMatchObject({ code: ConversionFailureCode.Cancelled });
    expect(terminate).toHaveBeenCalledOnce();
  });
});

function fakeWorker(terminate: () => void): ConversionWorkerPort {
  return {
    addEventListener: vi.fn(),
    postMessage: vi.fn(),
    terminate,
  };
}
