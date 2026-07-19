import type { ConversionFailureCode } from "./conversion-failure";

export interface ConversionWorkerRequest {
  heightPixels: number;
  rgbaBuffer: ArrayBuffer;
  widthPixels: number;
}

export type ConversionWorkerResponse =
  | { ok: true; svg: string }
  | { failureCode: ConversionFailureCode; ok: false };
