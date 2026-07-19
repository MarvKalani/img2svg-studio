import "./styles.css";
import { initializeConversion } from "./conversion/conversion-controller";
import { initializeImageLoader } from "./image/image-loader";
import { createImageStore } from "./image/image-store";

const imageStore = createImageStore();
initializeImageLoader(imageStore);
initializeConversion(imageStore);
document.documentElement.dataset.appReady = "true";
