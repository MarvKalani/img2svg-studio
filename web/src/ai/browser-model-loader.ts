import { createDemoModelLoader } from "./demo-model-loader";
import { createModnetModelLoader } from "./modnet-model-loader";
import type { ModelLoader } from "./model-registry";

export function createBrowserModelLoader(): ModelLoader {
  const modnetLoader = createModnetModelLoader();
  const upcomingModelLoader = createDemoModelLoader();
  const loader: ModelLoader = {
    load: (model, report) =>
      model.id === "modnet"
        ? modnetLoader.load(model, report)
        : upcomingModelLoader.load(model, report),
  };
  return Object.freeze(loader);
}
