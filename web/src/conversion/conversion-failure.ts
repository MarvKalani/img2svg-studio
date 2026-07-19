export const ConversionFailureCode = {
  InvalidDimensions: 1,
  PixelLength: 2,
  TransparentKeyUnavailable: 3,
  WorkerFailed: 4,
  InvalidSvg: 5,
} as const;

export type ConversionFailureCode =
  (typeof ConversionFailureCode)[keyof typeof ConversionFailureCode];

const failureMessages: Record<ConversionFailureCode, string> = {
  [ConversionFailureCode.InvalidDimensions]: "Die Bildmaße sind ungültig.",
  [ConversionFailureCode.PixelLength]: "Die Bilddaten passen nicht zu den Bildmaßen.",
  [ConversionFailureCode.TransparentKeyUnavailable]:
    "Die Transparenz dieses Bildes konnte nicht sicher verarbeitet werden.",
  [ConversionFailureCode.WorkerFailed]:
    "Die lokale Konvertierung ist fehlgeschlagen. Bitte versuche es erneut.",
  [ConversionFailureCode.InvalidSvg]: "Die Engine hat kein gültiges SVG erzeugt.",
};

export class ConversionFailure extends Error {
  readonly code: ConversionFailureCode;

  constructor(code: ConversionFailureCode) {
    super(failureMessages[code]);
    this.code = code;
    this.name = "ConversionFailure";
  }
}

export function readEngineFailureCode(error: unknown): ConversionFailureCode {
  switch (error) {
    case ConversionFailureCode.InvalidDimensions:
    case ConversionFailureCode.PixelLength:
    case ConversionFailureCode.TransparentKeyUnavailable:
      return error;
    default:
      return ConversionFailureCode.WorkerFailed;
  }
}

export function toConversionFailure(error: unknown): ConversionFailure {
  return error instanceof ConversionFailure
    ? error
    : new ConversionFailure(ConversionFailureCode.WorkerFailed);
}
