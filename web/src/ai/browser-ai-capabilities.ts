export interface BrowserAiCapabilities {
  readonly shaderF16: boolean;
  readonly smartSelect: boolean;
  readonly webGpu: boolean;
}

interface GpuAdapterLike {
  readonly features: Readonly<{ has(feature: string): boolean }>;
}

interface BrowserCapabilitySource {
  readonly gpu?: Readonly<{
    requestAdapter(): Promise<GpuAdapterLike | null>;
  }>;
}

const unavailableCapabilities: BrowserAiCapabilities = Object.freeze({
  shaderF16: false,
  smartSelect: false,
  webGpu: false,
});

export async function detectBrowserAiCapabilities(
  source: BrowserCapabilitySource = navigator as unknown as BrowserCapabilitySource,
): Promise<BrowserAiCapabilities> {
  if (!source.gpu) {
    return unavailableCapabilities;
  }
  try {
    const adapter = await source.gpu.requestAdapter();
    if (!adapter) {
      return unavailableCapabilities;
    }
    const shaderF16 = adapter.features.has("shader-f16");
    return Object.freeze({ shaderF16, smartSelect: shaderF16, webGpu: true });
  } catch {
    return unavailableCapabilities;
  }
}

export function showSupportedAiTools(capabilities: BrowserAiCapabilities): void {
  setHidden("#smart-select", !capabilities.smartSelect);
  setHidden("#smart-select-status", !capabilities.smartSelect);
}

function setHidden(selector: string, hidden: boolean): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`Required AI capability element is missing: ${selector}`);
  }
  element.hidden = hidden;
}
