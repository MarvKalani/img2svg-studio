import "./styles.css";
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
const optionsController = initializeConversionOptions();
const compareController = initializeCompare(createCompareSelection());
const historyController = initializeHistory(
  createHistoryStore(),
  optionsController.apply,
  compareController,
);
initializeImageLoader(imageStore, optionsController.showSourceDimensions);
initializeConversion(imageStore, optionsController.current, historyController.record);
initializeSvgDownload(imageStore);
document.documentElement.dataset.appReady = "true";
