import { WebMcpToolName } from "./webmcp-adapter";

export interface ToolCapability {
  readonly toolName: WebMcpToolName;
  readonly visibleUi: string;
}

export const toolCapabilityMap: readonly ToolCapability[] = Object.freeze([
  capability(WebMcpToolName.GetCapabilities, "html"),
  capability(WebMcpToolName.GetWorkspaceState, ".workspace"),
  capability(WebMcpToolName.ConfigureConversion, ".sidebar"),
  capability(WebMcpToolName.ConvertCurrentImage, "#convert-button"),
  capability(WebMcpToolName.CancelConversion, "#cancel-conversion"),
  capability(WebMcpToolName.ListConversionPresets, "#conversion-preset"),
  capability(WebMcpToolName.LoadConversionPreset, "#conversion-preset"),
  capability(WebMcpToolName.SaveConversionPreset, "#save-preset"),
  capability(WebMcpToolName.SelectHistoryRun, "#history-content"),
  capability(WebMcpToolName.DeleteHistoryRun, ".history-delete-button"),
  capability(
    WebMcpToolName.SelectComparisonA,
    "[data-compare-slot='a'], [data-compare-original-slot='a']",
  ),
  capability(
    WebMcpToolName.SelectComparisonB,
    "[data-compare-slot='b'], [data-compare-original-slot='b']",
  ),
  capability(WebMcpToolName.DownloadSelectedSvg, "#download-svg"),
  capability(WebMcpToolName.LoadModel, "#model-manager"),
  capability(WebMcpToolName.RetryModel, "#model-manager"),
  capability(WebMcpToolName.UnloadModel, "#model-manager"),
  capability(WebMcpToolName.PreviewMagicWandSelection, "#magic-wand, #magic-wand-overlay"),
  capability(WebMcpToolName.ApplyMagicWandSelection, "#magic-wand-remove"),
  capability(WebMcpToolName.ApplyBackgroundRemoval, "#remove-background"),
  capability(WebMcpToolName.ApplySmartSelection, "#smart-select"),
]);

function capability(toolName: WebMcpToolName, visibleUi: string): ToolCapability {
  return Object.freeze({ toolName, visibleUi });
}
