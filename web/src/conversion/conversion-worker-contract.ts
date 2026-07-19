export interface ConversionWorkerRequest {
  heightPixels: number;
  rgbaBuffer: ArrayBuffer;
  widthPixels: number;
}

export type ConversionWorkerResponse = { ok: true; svg: string } | { error: string; ok: false };
