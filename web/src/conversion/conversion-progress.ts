export const ConversionProgressPhase = {
  Clustering: "clustering",
  CutoutClustering: "cutout-clustering",
  Tracing: "tracing",
} as const;

export type ConversionProgressPhase =
  (typeof ConversionProgressPhase)[keyof typeof ConversionProgressPhase];

export interface ConversionProgressUpdate {
  readonly completed: number;
  readonly phase: ConversionProgressPhase;
  readonly total: number;
}

export interface ConversionProgressPresentation {
  readonly detail: string;
  readonly label: string;
  readonly maximum: number;
  readonly value: number;
}

const progressPhases = new Set<string>(Object.values(ConversionProgressPhase));

export function readConversionProgressPhase(value: string): ConversionProgressPhase | undefined {
  return progressPhases.has(value) ? (value as ConversionProgressPhase) : undefined;
}

export function presentConversionProgress(
  update: ConversionProgressUpdate,
): ConversionProgressPresentation {
  const maximum = Math.max(1, update.total);
  const value = Math.min(Math.max(0, update.completed), maximum);
  switch (update.phase) {
    case ConversionProgressPhase.Clustering:
      return percentagePresentation("Farbflächen erkennen", value, maximum);
    case ConversionProgressPhase.CutoutClustering:
      return percentagePresentation("Ausschnitte aufbereiten", value, maximum);
    case ConversionProgressPhase.Tracing:
      return {
        detail: `${String(update.completed)} / ${String(update.total)} Farbflächen`,
        label: "SVG-Konturen erzeugen",
        maximum,
        value,
      };
  }
}

function percentagePresentation(
  label: string,
  value: number,
  maximum: number,
): ConversionProgressPresentation {
  return {
    detail: `${String(Math.round((value / maximum) * 100))} %`,
    label,
    maximum,
    value,
  };
}
