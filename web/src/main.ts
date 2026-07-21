import "./styles.css";
import "./history/history.css";
import "./help/interactive-handbook.css";
import "./footer.css";
import "./compare-split.css";
import "./workspace-view.css";
import "./context-menu/context-menu.css";
import "./layout/layout-preferences.css";
import { initializeBackgroundRemoval } from "./ai/background-removal-controller";
import { detectBrowserAiCapabilities, showSupportedAiTools } from "./ai/browser-ai-capabilities";
import { createBrowserModelLoader } from "./ai/browser-model-loader";
import { browserModelManifest } from "./ai/model-manifest";
import { initializeModelManager } from "./ai/model-manager";
import { createModelRegistry } from "./ai/model-registry";
import { initializeSmartSelect } from "./ai/smart-select-controller";
import { initializeCompare } from "./compare/compare-controller";
import { createCompareSelection } from "./compare/compare-selection";
import { initializeConversion } from "./conversion/conversion-controller";
import { initializeConversionOptions } from "./conversion/conversion-options-controller";
import { initializeSvgDownload } from "./conversion/svg-download";
import { createLogoDemoOptions } from "./demo/logo-demo-profile";
import { createTopographyDemoOptions } from "./demo/topography-demo-profile";
import { initializeImageLoader } from "./image/image-loader";
import { createImageStore } from "./image/image-store";
import { initializePwaIngress } from "./pwa/pwa-ingress";
import { showAppVersion } from "./release/app-version";
import { initializeMagicWand } from "./selection/magic-wand-controller";
import { createSelectionActivity } from "./selection/selection-activity";
import { initializeHistory } from "./history/history-controller";
import { createHistoryStore } from "./history/history-store";
import { initializeInteractiveHandbook } from "./help/interactive-handbook";
import { initializeLocalization } from "./i18n/localization";
import { initializeWorkspaceView } from "./workspace/workspace-view-controller";
import {
  initializeWebMcp,
  WebMcpToolName,
  type WebMcpDocument,
  type WebMcpRegistration,
} from "./webmcp/webmcp-adapter";
import { createConversionTools } from "./webmcp/conversion-tools";
import { createStudioTools } from "./webmcp/studio-tools";
import { initializeContextMenu } from "./context-menu/context-menu-controller";
import { initializeLayoutPreferences } from "./layout/layout-preferences";
import {
  hardwareRasterResize,
  resolveHardwareProfile,
  showHardwareProfile,
} from "./hardware/hardware-profile";

initializeLocalization();
initializeLayoutPreferences();
const handbookController = initializeInteractiveHandbook();
showAppVersion();
const hardwareProfile = resolveHardwareProfile();
showHardwareProfile(hardwareProfile);
const imageStore = createImageStore();
const aiCapabilities = await detectBrowserAiCapabilities();
const availableModelIds = new Set<"modnet" | "slimsam">([
  "modnet",
  ...(aiCapabilities.smartSelect ? (["slimsam"] as const) : []),
]);
showSupportedAiTools(aiCapabilities);
const workspaceView = initializeWorkspaceView(imageStore);
const modelRegistry = createModelRegistry(browserModelManifest, createBrowserModelLoader());
const selectionActivity = createSelectionActivity();
const optionsController = initializeConversionOptions(hardwareRasterResize(hardwareProfile));
const compareController = initializeCompare(createCompareSelection(), workspaceView.showComparison);
const historyController = initializeHistory(
  createHistoryStore(),
  optionsController.apply,
  compareController,
);
let backgroundRemoval: ReturnType<typeof initializeBackgroundRemoval>;
let magicWand: ReturnType<typeof initializeMagicWand>;
let smartSelect: ReturnType<typeof initializeSmartSelect>;
let conversionController: ReturnType<typeof initializeConversion>;
const imageLoader = initializeImageLoader(
  imageStore,
  (image) => {
    historyController.clearComparison();
    const original = imageStore.original();
    if (original) {
      historyController.setOriginal(original);
    }
    optionsController.showSourceDimensions(image);
    workspaceView.showProcessed();
    backgroundRemoval.imageLoaded();
    magicWand.imageLoaded();
    smartSelect.imageLoaded();
    conversionController.requestPreview();
  },
  () => optionsController.apply(createLogoDemoOptions()),
  () => optionsController.apply(createTopographyDemoOptions()),
);
backgroundRemoval = initializeBackgroundRemoval(
  imageStore,
  imageLoader,
  modelRegistry,
  workspaceView,
);
magicWand = initializeMagicWand(imageLoader, selectionActivity, workspaceView);
smartSelect = initializeSmartSelect(
  imageStore,
  imageLoader,
  modelRegistry,
  selectionActivity,
  workspaceView,
);
conversionController = initializeConversion(imageStore, optionsController.current, {
  recordRun: historyController.record,
  showPreview: historyController.setDraft,
});
optionsController.subscribe(conversionController.requestPreview);
void initializePwaIngress(imageLoader);
const svgDownloadController = initializeSvgDownload();
initializeContextMenu({
  compare: compareController,
  conversion: conversionController,
  download: svgDownloadController,
  handbook: handbookController,
  options: optionsController,
  workspace: workspaceView,
});
initializeModelManager(modelRegistry, availableModelIds);
let webMcpRegistration: WebMcpRegistration | undefined;
const conversionTools = createConversionTools({
  applyOptions: optionsController.apply,
  cancel: conversionController.cancel,
  convert: conversionController.convert,
  readOptions: optionsController.current,
});
const studioTools = createStudioTools(
  {
    applySmartSelection: smartSelect.applySelection,
    assignComparison: historyController.assignComparison,
    assignOriginalComparison: historyController.assignOriginalComparison,
    downloadSelectedSvg: svgDownloadController.download,
    loadModel: modelRegistry.load,
    readComparedRuns: compareController.current,
    readImage: imageStore.current,
    readModels: () =>
      modelRegistry.snapshots().filter((snapshot) => availableModelIds.has(snapshot.model.id)),
    readOptions: optionsController.current,
    readRuns: historyController.runs,
    removeRun: (runId) => historyController.remove(runId) !== undefined,
    removeBackground: backgroundRemoval.removeBackground,
    retryModel: modelRegistry.retry,
    selectRun: historyController.select,
    unloadModel: modelRegistry.unload,
  },
  {
    modelIds: [...availableModelIds],
    smartSelection: aiCapabilities.smartSelect,
  },
);
const applicationTools = [...conversionTools, ...studioTools];
const webMcpToolNames = [
  WebMcpToolName.GetCapabilities,
  ...applicationTools.map((tool) => tool.name),
];
void initializeWebMcp(
  document as WebMcpDocument,
  () => ({
    imageLoaded: imageStore.current() !== undefined,
    tools: webMcpToolNames,
    version: "1",
  }),
  applicationTools,
).then((registration) => {
  webMcpRegistration = registration;
  document.documentElement.dataset.webmcp = registration.status;
});
window.addEventListener("beforeunload", () => webMcpRegistration?.dispose());
document.documentElement.dataset.appReady = "true";
