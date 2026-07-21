export const WebMcpToolName = {
  ApplyBackgroundRemoval: "apply_background_removal",
  ApplySmartSelection: "apply_smart_selection",
  CancelConversion: "cancel_conversion",
  ConfigureConversion: "configure_conversion",
  ConvertCurrentImage: "convert_current_image",
  DownloadSelectedSvg: "download_selected_svg",
  GetCapabilities: "get_capabilities",
  GetWorkspaceState: "get_workspace_state",
  ListConversionPresets: "list_conversion_presets",
  LoadConversionPreset: "load_conversion_preset",
  LoadModel: "load_model",
  RetryModel: "retry_model",
  SaveConversionPreset: "save_conversion_preset",
  DeleteHistoryRun: "delete_history_run",
  SelectComparisonA: "select_comparison_a",
  SelectComparisonB: "select_comparison_b",
  SelectHistoryRun: "select_history_run",
  UnloadModel: "unload_model",
} as const;

export type WebMcpToolName = (typeof WebMcpToolName)[keyof typeof WebMcpToolName];

export interface StudioCapabilities {
  readonly imageLoaded: boolean;
  readonly tools: readonly string[];
  readonly version: "1";
}

export interface WebMcpTool {
  readonly annotations: {
    readonly readOnlyHint: boolean;
    readonly untrustedContentHint: boolean;
  };
  readonly description: string;
  readonly execute: (input: unknown) => Promise<string> | string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly name: string;
}

export interface WebMcpModelContext {
  registerTool(tool: WebMcpTool, options?: { readonly signal?: AbortSignal }): Promise<void>;
}

export interface WebMcpDocument {
  readonly modelContext?: WebMcpModelContext;
}

export type WebMcpRegistrationStatus = "registered" | "registration-failed" | "unsupported";

export interface WebMcpRegistration {
  dispose(): void;
  readonly status: WebMcpRegistrationStatus;
  readonly toolNames: readonly string[];
}

const emptyObjectSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({}),
  type: "object",
});

export async function initializeWebMcp(
  source: WebMcpDocument,
  readCapabilities: () => StudioCapabilities,
  applicationTools: readonly WebMcpTool[] = [],
): Promise<WebMcpRegistration> {
  const modelContext = source.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    return registration("unsupported", [], () => undefined);
  }

  const controller = new AbortController();
  const tools = [capabilitiesTool(readCapabilities), ...applicationTools];
  try {
    for (const tool of tools) {
      await modelContext.registerTool(tool, { signal: controller.signal });
    }
    return registration(
      "registered",
      tools.map((tool) => tool.name),
      () => controller.abort(),
    );
  } catch {
    controller.abort();
    return registration("registration-failed", [], () => undefined);
  }
}

function capabilitiesTool(readCapabilities: () => StudioCapabilities): WebMcpTool {
  return Object.freeze({
    annotations: Object.freeze({ readOnlyHint: true, untrustedContentHint: false }),
    description: "Read the img2svg Studio agent capabilities and current image availability.",
    execute: () => JSON.stringify(readCapabilities()),
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.GetCapabilities,
  });
}

function registration(
  status: WebMcpRegistrationStatus,
  toolNames: readonly string[],
  dispose: () => void,
): WebMcpRegistration {
  return Object.freeze({ dispose, status, toolNames: Object.freeze([...toolNames]) });
}
