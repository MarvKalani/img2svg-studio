export const ImageVersionKind = {
  AiResult: "ai-result",
  Original: "original",
} as const;

export type ImageVersionKind = (typeof ImageVersionKind)[keyof typeof ImageVersionKind];

export interface ImageVersion {
  readonly id: number;
  readonly kind: ImageVersionKind;
}

export function formatImageVersion(version: ImageVersion): string {
  const kind = version.kind === ImageVersionKind.Original ? "Original" : "KI-Ergebnis";
  return `${kind} · V${String(version.id)}`;
}
