import type { BrowserModelDefinition } from "./model-manifest";
import type { ModelLoadUpdate } from "./model-registry";

type DownloadProgress = Readonly<{
  file?: string;
  loaded?: number;
  status: string;
}>;

export function createDownloadProgressReporter(
  model: BrowserModelDefinition,
  report: (update: ModelLoadUpdate) => void,
): (progress: DownloadProgress) => void {
  const downloadedByPath = new Map(model.files.map((file) => [file.path, 0]));

  return (progress): void => {
    const artifact = model.files.find(
      (file) => progress.file === file.path || progress.file?.endsWith(`/${file.path}`),
    );
    if (!artifact) {
      return;
    }

    const reportedBytes =
      progress.status === "done"
        ? artifact.bytes
        : progress.status === "progress" && Number.isFinite(progress.loaded)
          ? Math.min(Math.max(progress.loaded ?? 0, 0), artifact.bytes)
          : (downloadedByPath.get(artifact.path) ?? 0);
    downloadedByPath.set(
      artifact.path,
      Math.max(downloadedByPath.get(artifact.path) ?? 0, reportedBytes),
    );
    report({
      downloadedBytes: [...downloadedByPath.values()].reduce((total, bytes) => total + bytes, 0),
      phase: "downloading",
    });
  };
}
