export const ImageVersionKind = {
  AiResult: "ai-result",
  ManualResult: "manual-result",
  Original: "original",
} as const;

export type ImageVersionKind = (typeof ImageVersionKind)[keyof typeof ImageVersionKind];

export interface ImageVersion {
  readonly id: number;
  readonly kind: ImageVersionKind;
}

export function formatImageVersion(version: ImageVersion): string {
  const kind = {
    [ImageVersionKind.AiResult]: "KI-Ergebnis",
    [ImageVersionKind.ManualResult]: "Bearbeitet",
    [ImageVersionKind.Original]: "Original",
  }[version.kind];
  return `${kind} · V${String(version.id)}`;
}
