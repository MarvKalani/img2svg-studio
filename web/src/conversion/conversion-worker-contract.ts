import type { ConversionFailureCode } from "./conversion-failure";
import type { ConversionOptions } from "./conversion-options";

export interface ConversionWorkerRequest {
  heightPixels: number;
  options: ConversionOptions;
  rgbaBuffer: ArrayBuffer;
  widthPixels: number;
}

export type ConversionWorkerResponse =
  | { ok: true; svg: string }
  | { failureCode: ConversionFailureCode; ok: false };
