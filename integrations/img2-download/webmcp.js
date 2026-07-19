/**
 * Drop-in replacement for https://img2.download/js/webmcp.js.
 * It targets Chrome 150's document.modelContext API and reuses the predecessor's UI services.
 */
import { DOM } from "./config.js";
import { renderFileQueue, resetWorkspace, updateTotalSizeEstimate } from "./file-queue-v2.js";
import { calculateAllRealSizes, processSingleImage } from "./image-processing.js";
import {
  closePreviewModal,
  openPreviewModal,
  resetZoom,
  showNextFile,
  showPrevFile,
} from "./modal.js";
import * as state from "./state.js";
import { handleTransformation } from "./transformations.js";
import { processAndDownload } from "./zip.js";

const emptyObjectSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({}),
  type: "object",
});

let registrationController;

export async function initWebMCP() {
  const modelContext = document.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") {
    console.info("WebMCP is unavailable; the converter remains fully usable through its UI.");
    return;
  }

  registrationController?.abort();
  registrationController = new AbortController();
  try {
    for (const tool of createTools()) {
      await modelContext.registerTool(tool, { signal: registrationController.signal });
    }
    console.info("WebMCP tools registered through document.modelContext.");
  } catch (error) {
    registrationController.abort();
    console.error("WebMCP registration failed.", error);
  }
}

function createTools() {
  return [
    readStateTool(),
    conversionSettingsTool(),
    clearQueueTool(),
    calculateSizesTool(),
    batchDownloadTool(),
    openPreviewTool(),
    previewControlTool(),
    transformImageTool(),
    svgSettingsTool(),
    singleDownloadTool(),
    budgetModeTool(),
  ];
}

function readStateTool() {
  return tool({
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    description:
      "Read visible converter settings, queue length, preview index, and processing state.",
    execute: () =>
      success({
        budgetMode: state.budgetMode,
        budgetTargetMB: state.budgetTargetMB,
        format: DOM.formatSelect?.value ?? "webp",
        previewIndex: state.activePreviewIndex,
        processing: state.isProcessing,
        quality: numericValue(DOM.qualitySlider, 85),
        queueLength: state.fileQueue.length,
        scalePercent: numericValue(DOM.percentSlider, 100),
      }),
    inputSchema: emptyObjectSchema,
    name: "get_app_state",
  });
}

function conversionSettingsTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    description: "Set the visible target format, quality, and scale through existing UI events.",
    execute: (input) => {
      if (!isRecord(input)) return invalidInput();
      let changed = false;
      if (["webp", "jpeg", "png", "svg"].includes(input.format)) {
        changed = setControlValue(DOM.formatSelect, input.format, "change") || changed;
      }
      if (integerWithin(input.quality, 10, 100)) {
        changed = setControlValue(DOM.qualitySlider, input.quality, "input") || changed;
      }
      if (integerWithin(input.scalePercent, 5, 200)) {
        changed = setControlValue(DOM.percentSlider, input.scalePercent, "input") || changed;
      }
      return changed ? success({ changed: true }) : invalidInput();
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        format: { enum: ["webp", "jpeg", "png", "svg"], type: "string" },
        quality: { maximum: 100, minimum: 10, type: "integer" },
        scalePercent: { maximum: 200, minimum: 5, type: "integer" },
      },
      type: "object",
    },
    name: "set_conversion_settings",
  });
}

function clearQueueTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    description: "Clear the visible local file queue and reset the converter workspace.",
    execute: () => {
      resetWorkspace();
      renderFileQueue();
      updateTotalSizeEstimate();
      return success({ queueLength: state.fileQueue.length });
    },
    inputSchema: emptyObjectSchema,
    name: "clear_queue",
  });
}

function calculateSizesTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    description: "Calculate real output sizes for every image currently visible in the queue.",
    execute: async () => {
      if (state.fileQueue.length === 0)
        return failure("empty_queue", "Die Warteschlange ist leer.");
      await calculateAllRealSizes(() => undefined);
      renderFileQueue();
      updateTotalSizeEstimate();
      return success({ calculated: state.fileQueue.length });
    },
    inputSchema: emptyObjectSchema,
    name: "calculate_sizes",
  });
}

function batchDownloadTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description:
      "Process the visible queue with current settings and start its ZIP or file download.",
    execute: async () => {
      if (state.fileQueue.length === 0)
        return failure("empty_queue", "Die Warteschlange ist leer.");
      await processAndDownload();
      return success({ processed: state.fileQueue.length });
    },
    inputSchema: emptyObjectSchema,
    name: "process_and_download",
  });
}

function openPreviewTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: "Open the visible preview and A/B editor for one queued image.",
    execute: (input) => {
      const fileIndex = readFileIndex(input);
      if (fileIndex === undefined) return invalidFileIndex();
      openPreviewModal(fileIndex);
      return success({ fileIndex });
    },
    inputSchema: fileIndexSchema(),
    name: "open_preview",
  });
}

function previewControlTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description:
      "Navigate, close, reset zoom, or change the split direction in the visible preview.",
    execute: (input) => {
      if (!isRecord(input)) return invalidInput();
      const actions = {
        close: closePreviewModal,
        next: showNextFile,
        previous: showPrevFile,
        "reset-zoom": resetZoom,
        "toggle-split": () => document.getElementById("ab-split-toggle-btn")?.click(),
      };
      const action = actions[input.action];
      if (!action || state.activePreviewIndex < 0) return invalidInput();
      action();
      return success({ action: input.action, previewIndex: state.activePreviewIndex });
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        action: {
          enum: ["previous", "next", "close", "reset-zoom", "toggle-split"],
          type: "string",
        },
      },
      required: ["action"],
      type: "object",
    },
    name: "control_preview",
  });
}

function transformImageTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: "Rotate or flip one queued image through the existing transformation service.",
    execute: async (input) => {
      const fileIndex = readFileIndex(input);
      const action = isRecord(input) ? input.action : undefined;
      if (
        fileIndex === undefined ||
        !["rotate-left", "rotate-right", "flip-horizontal", "flip-vertical"].includes(action)
      ) {
        return invalidInput();
      }
      await handleTransformation(fileIndex, action);
      return success({ action, fileIndex });
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        action: {
          enum: ["rotate-left", "rotate-right", "flip-horizontal", "flip-vertical"],
          type: "string",
        },
        fileIndex: { minimum: 0, type: "integer" },
      },
      required: ["fileIndex", "action"],
      type: "object",
    },
    name: "transform_image",
  });
}

function svgSettingsTool() {
  const settings = {
    colorPrecision: ["svg-color-precision", 1, 8],
    cornerThreshold: ["svg-corner-threshold", 0, 180],
    filterSpeckle: ["svg-filter-speckle", 0, 128],
    layerDifference: ["svg-layer-difference", 0, 100],
    lengthThreshold: ["svg-length-threshold", 0, 100],
    maxIterations: ["svg-max-iterations", 1, 50],
    pathPrecision: ["svg-path-precision", 0, 8],
    spliceThreshold: ["svg-splice-threshold", 0, 180],
  };
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    description: "Set visible VTracer SVG controls while the target format is SVG.",
    execute: (input) => {
      if (!isRecord(input)) return invalidInput();
      const changed = [];
      for (const [name, [elementId, minimum, maximum]] of Object.entries(settings)) {
        if (integerWithin(input[name], minimum, maximum)) {
          setControlValue(document.getElementById(elementId), input[name], "input");
          changed.push(name);
        }
      }
      if (["stacked", "cutout"].includes(input.hierarchical)) {
        setControlValue(document.getElementById("svg-hierarchical"), input.hierarchical, "change");
        changed.push("hierarchical");
      }
      return changed.length > 0 ? success({ changed }) : invalidInput();
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        colorPrecision: { maximum: 8, minimum: 1, type: "integer" },
        cornerThreshold: { maximum: 180, minimum: 0, type: "integer" },
        filterSpeckle: { maximum: 128, minimum: 0, type: "integer" },
        hierarchical: { enum: ["stacked", "cutout"], type: "string" },
        layerDifference: { maximum: 100, minimum: 0, type: "integer" },
        lengthThreshold: { maximum: 100, minimum: 0, type: "integer" },
        maxIterations: { maximum: 50, minimum: 1, type: "integer" },
        pathPrecision: { maximum: 8, minimum: 0, type: "integer" },
        spliceThreshold: { maximum: 180, minimum: 0, type: "integer" },
      },
      type: "object",
    },
    name: "set_svg_settings",
  });
}

function singleDownloadTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: "Process and download one queued image with the visible conversion settings.",
    execute: async (input) => {
      const fileIndex = readFileIndex(input);
      if (fileIndex === undefined) return invalidFileIndex();
      const fileObject = state.fileQueue[fileIndex];
      const format = DOM.formatSelect?.value ?? "webp";
      if (format === "svg" && fileObject.svgData) {
        downloadBlob(
          new Blob([fileObject.svgData], { type: "image/svg+xml" }),
          outputName(fileObject.file.name, "svg"),
        );
        return success({ fileIndex });
      }
      const result = await processSingleImage(fileObject);
      if (!result?.dataUrl) return failure("processing_failed", "Es wurde keine Ausgabe erzeugt.");
      downloadUrl(result.dataUrl, outputName(fileObject.file.name, result.extension ?? format));
      return success({ fileIndex });
    },
    inputSchema: fileIndexSchema(),
    name: "download_single_image",
  });
}

function budgetModeTool() {
  return tool({
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    description: "Enable or disable the visible size budget and optionally set its MB target.",
    execute: (input) => {
      if (!isRecord(input) || typeof input.enabled !== "boolean") return invalidInput();
      setChecked(document.getElementById("budget-mode-toggle"), input.enabled);
      if (input.targetMB !== undefined) {
        if (!integerWithin(input.targetMB, 1, 25)) return invalidInput();
        setControlValue(document.getElementById("budget-slider"), input.targetMB, "input");
      }
      return success({ enabled: input.enabled, targetMB: state.budgetTargetMB });
    },
    inputSchema: {
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        targetMB: { maximum: 25, minimum: 1, type: "integer" },
      },
      required: ["enabled"],
      type: "object",
    },
    name: "set_budget_mode",
  });
}

function tool(definition) {
  return Object.freeze({
    ...definition,
    annotations: Object.freeze(definition.annotations),
  });
}

function fileIndexSchema() {
  return {
    additionalProperties: false,
    properties: { fileIndex: { minimum: 0, type: "integer" } },
    required: ["fileIndex"],
    type: "object",
  };
}

function readFileIndex(input) {
  if (!isRecord(input) || !Number.isSafeInteger(input.fileIndex)) return undefined;
  return input.fileIndex >= 0 && input.fileIndex < state.fileQueue.length
    ? input.fileIndex
    : undefined;
}

function setControlValue(control, value, eventName) {
  if (!control) return false;
  control.value = String(value);
  control.dispatchEvent(new Event(eventName, { bubbles: true }));
  return true;
}

function setChecked(control, checked) {
  if (!(control instanceof HTMLInputElement)) return false;
  control.checked = checked;
  control.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function numericValue(control, fallback) {
  const value = Number(control?.value);
  return Number.isFinite(value) ? value : fallback;
}

function integerWithin(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, fileName);
  // Chrome must consume the click before the temporary object URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadUrl(url, fileName) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
}

function outputName(sourceName, extension) {
  return `${sourceName.replace(/\.[^/.]+$/, "") || "conversion"}.${extension}`;
}

function invalidFileIndex() {
  return failure("invalid_file_index", "Der Dateiindex ist außerhalb der Warteschlange.");
}

function invalidInput() {
  return failure("invalid_input", "Die Werkzeugparameter sind ungültig.");
}

function success(result) {
  return JSON.stringify({ ok: true, ...result });
}

function failure(code, message) {
  return JSON.stringify({ code, message, ok: false });
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
