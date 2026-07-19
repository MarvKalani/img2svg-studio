import "./styles.css";
import { initializeBackgroundRemoval } from "./ai/background-removal-controller";
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
import { initializeImageLoader } from "./image/image-loader";
import { createImageStore } from "./image/image-store";
import { initializeHistory } from "./history/history-controller";
import { createHistoryStore } from "./history/history-store";
import {
  initializeWebMcp,
  WebMcpToolName,
  type WebMcpDocument,
  type WebMcpRegistration,
} from "./webmcp/webmcp-adapter";

const imageStore = createImageStore();
const modelRegistry = createModelRegistry(browserModelManifest, createBrowserModelLoader());
const optionsController = initializeConversionOptions();
const compareController = initializeCompare(createCompareSelection());
const historyController = initializeHistory(
  createHistoryStore(),
  optionsController.apply,
  compareController,
);
let backgroundRemoval: ReturnType<typeof initializeBackgroundRemoval>;
let smartSelect: ReturnType<typeof initializeSmartSelect>;
const imageLoader = initializeImageLoader(imageStore, (image) => {
  historyController.clearComparison();
  optionsController.showSourceDimensions(image);
  backgroundRemoval.imageLoaded();
  smartSelect.imageLoaded();
});
backgroundRemoval = initializeBackgroundRemoval(imageStore, imageLoader, modelRegistry);
smartSelect = initializeSmartSelect(imageStore, imageLoader, modelRegistry);
initializeConversion(imageStore, optionsController.current, historyController.record);
initializeSvgDownload();
initializeModelManager(modelRegistry);
let webMcpRegistration: WebMcpRegistration | undefined;
void initializeWebMcp(document as WebMcpDocument, () => ({
  imageLoaded: imageStore.current() !== undefined,
  tools: [WebMcpToolName.GetCapabilities],
  version: "1",
})).then((registration) => {
  webMcpRegistration = registration;
  document.documentElement.dataset.webmcp = registration.status;
});
window.addEventListener("beforeunload", () => webMcpRegistration?.dispose());
document.documentElement.dataset.appReady = "true";
