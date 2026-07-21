export function formatByteSize(bytes: number): string {
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    throw new TypeError("Byte size must be a non-negative safe integer.");
  }
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 ** 2) {
    return `${formatBinaryUnit(bytes / 1024)} KiB`;
  }
  return `${formatBinaryUnit(bytes / 1024 ** 2)} MiB`;
}

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function formatBinaryUnit(value: number): string {
  return value.toFixed(2).replace(".", ",");
}
