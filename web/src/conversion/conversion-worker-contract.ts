import type { ConversionFailureCode } from "./conversion-failure";
import type { ConversionOptions } from "./conversion-options";
import type { ConversionProgressUpdate } from "./conversion-progress";

export interface ConversionWorkerRequest {
  heightPixels: number;
  options: ConversionOptions;
  rgbaBuffer: ArrayBuffer;
  widthPixels: number;
}

export type ConversionWorkerResponse =
  | { progress: ConversionProgressUpdate }
  | { ok: true; svg: string }
  | { failureCode: ConversionFailureCode; ok: false };
