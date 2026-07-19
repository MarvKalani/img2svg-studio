export const PredecessorCommand = {
  CalculateSizes: "calculate-sizes",
  ClearQueue: "clear-queue",
  ConfigureBudget: "configure-budget",
  ConfigureConversion: "configure-conversion",
  ConfigureSvg: "configure-svg",
  ControlPreview: "control-preview",
  DownloadBatch: "download-batch",
  DownloadSingle: "download-single",
  OpenPreview: "open-preview",
  ReadState: "read-state",
  TransformImage: "transform-image",
} as const;

export type PredecessorCommand = (typeof PredecessorCommand)[keyof typeof PredecessorCommand];

export const PredecessorToolName = {
  CalculateSizes: "calculate_sizes",
  ClearQueue: "clear_queue",
  ControlPreview: "control_preview",
  DownloadSingleImage: "download_single_image",
  GetAppState: "get_app_state",
  OpenPreview: "open_preview",
  ProcessAndDownload: "process_and_download",
  SetBudgetMode: "set_budget_mode",
  SetConversionSettings: "set_conversion_settings",
  SetSvgSettings: "set_svg_settings",
  TransformImage: "transform_image",
} as const;

export type PredecessorToolName = (typeof PredecessorToolName)[keyof typeof PredecessorToolName];

export interface PredecessorCapability {
  readonly command: PredecessorCommand;
  readonly toolName: PredecessorToolName;
  readonly visibleUi: string;
}

export const predecessorCapabilityMap: readonly PredecessorCapability[] = Object.freeze([
  capability(PredecessorCommand.ReadState, PredecessorToolName.GetAppState, "#workspace"),
  capability(
    PredecessorCommand.ConfigureConversion,
    PredecessorToolName.SetConversionSettings,
    "#settings-panel",
  ),
  capability(PredecessorCommand.ClearQueue, PredecessorToolName.ClearQueue, "#reset-all-btn"),
  capability(
    PredecessorCommand.CalculateSizes,
    PredecessorToolName.CalculateSizes,
    "#calculate-all-btn",
  ),
  capability(
    PredecessorCommand.DownloadBatch,
    PredecessorToolName.ProcessAndDownload,
    "#process-button",
  ),
  capability(
    PredecessorCommand.OpenPreview,
    PredecessorToolName.OpenPreview,
    "#file-list-container",
  ),
  capability(
    PredecessorCommand.ControlPreview,
    PredecessorToolName.ControlPreview,
    "#preview-modal",
  ),
  capability(
    PredecessorCommand.TransformImage,
    PredecessorToolName.TransformImage,
    ".modal-transform-controls",
  ),
  capability(
    PredecessorCommand.ConfigureSvg,
    PredecessorToolName.SetSvgSettings,
    "#svg-settings-panel",
  ),
  capability(
    PredecessorCommand.DownloadSingle,
    PredecessorToolName.DownloadSingleImage,
    "#save-action-btn",
  ),
  capability(
    PredecessorCommand.ConfigureBudget,
    PredecessorToolName.SetBudgetMode,
    "#budget-mode-group",
  ),
]);

function capability(
  command: PredecessorCommand,
  toolName: PredecessorToolName,
  visibleUi: string,
): PredecessorCapability {
  return Object.freeze({ command, toolName, visibleUi });
}
