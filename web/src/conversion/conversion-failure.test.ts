import { describe, expect, test } from "vitest";
import {
  ConversionFailure,
  ConversionFailureCode,
  readEngineFailureCode,
} from "./conversion-failure";

describe("conversion failures", () => {
  test("Given a typed WASM error code, when read, then its understandable UI message is preserved", () => {
    const failure = new ConversionFailure(readEngineFailureCode(ConversionFailureCode.PixelLength));

    expect(failure.code).toBe(ConversionFailureCode.PixelLength);
    expect(failure.message).toBe("Die Bilddaten passen nicht zu den Bildmaßen.");
  });

  test("Given an unknown worker error, when read, then it becomes the safe worker failure", () => {
    expect(readEngineFailureCode("panic")).toBe(ConversionFailureCode.WorkerFailed);
  });
});
