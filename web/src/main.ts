import "./styles.css";
import { initializeConversion } from "./conversion/conversion-controller";
import { initializeSvgDownload } from "./conversion/svg-download";
import { initializeImageLoader } from "./image/image-loader";
import { createImageStore } from "./image/image-store";

const imageStore = createImageStore();
initializeImageLoader(imageStore);
initializeConversion(imageStore);
initializeSvgDownload(imageStore);
document.documentElement.dataset.appReady = "true";
