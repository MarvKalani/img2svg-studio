import "./styles.css";
import { initializeBackgroundRemoval } from "./ai/background-removal-controller";
import { createBrowserModelLoader } from "./ai/browser-model-loader";
import { browserModelManifest } from "./ai/model-manifest";
import { initializeModelManager } from "./ai/model-manager";
import { createModelRegistry } from "./ai/model-registry";
import { initializeCompare } from "./compare/compare-controller";
import { createCompareSelection } from "./compare/compare-selection";
import { initializeConversion } from "./conversion/conversion-controller";
import { initializeConversionOptions } from "./conversion/conversion-options-controller";
import { initializeSvgDownload } from "./conversion/svg-download";
import { initializeImageLoader } from "./image/image-loader";
import { createImageStore } from "./image/image-store";
import { initializeHistory } from "./history/history-controller";
import { createHistoryStore } from "./history/history-store";

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
const imageLoader = initializeImageLoader(imageStore, (image) => {
  optionsController.showSourceDimensions(image);
  backgroundRemoval.imageLoaded();
});
backgroundRemoval = initializeBackgroundRemoval(imageStore, imageLoader, modelRegistry);
initializeConversion(imageStore, optionsController.current, historyController.record);
initializeSvgDownload(imageStore);
initializeModelManager(modelRegistry);
document.documentElement.dataset.appReady = "true";
