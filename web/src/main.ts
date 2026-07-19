import "./styles.css";
import { initializeConversion } from "./conversion/conversion-controller";
import { initializeConversionOptions } from "./conversion/conversion-options-controller";
import { initializeSvgDownload } from "./conversion/svg-download";
import { initializeImageLoader } from "./image/image-loader";
import { createImageStore } from "./image/image-store";

const imageStore = createImageStore();
const optionsController = initializeConversionOptions();
initializeImageLoader(imageStore, optionsController.showSourceDimensions);
initializeConversion(imageStore, optionsController.current);
initializeSvgDownload(imageStore);
document.documentElement.dataset.appReady = "true";
