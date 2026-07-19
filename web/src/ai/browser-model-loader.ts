import { createModnetModelLoader } from "./modnet-model-loader";
import type { ModelLoader } from "./model-registry";
import { createSamModelLoader } from "./sam-model-loader";

export function createBrowserModelLoader(): ModelLoader {
  const modnetLoader = createModnetModelLoader();
  const samLoader = createSamModelLoader();
  const loader: ModelLoader = {
    load: (model, report, context) => {
      if (model.id === "modnet") {
        return modnetLoader.load(model, report, context);
      }
      return samLoader.load(model, report, context);
    },
  };
  return Object.freeze(loader);
}
