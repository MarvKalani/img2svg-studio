import "./styles.css";
import { initializeImageLoader } from "./image/image-loader";

initializeImageLoader();
document.documentElement.dataset.appReady = "true";
