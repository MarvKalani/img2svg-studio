import { appVersion } from "../release/app-version";

const sharedImageParameter = "shared-image";
const sharedImageRoute = "/__shared-image/";

export interface PwaImageLoader {
  loadOriginal(file: File): Promise<boolean>;
  reportError(message: string): void;
}

export interface PwaBrowserPort {
  consumeLaunchFiles(consumer: (files: readonly File[]) => Promise<void>): void;
  fetchSharedImage(token: string): Promise<File>;
  readSharedImageToken(): string | undefined;
  registerServiceWorker(): Promise<void>;
  removeSharedImageToken(): void;
}

interface LaunchFileHandle {
  getFile(): Promise<File>;
}

interface LaunchParams {
  files: readonly LaunchFileHandle[];
}

interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}

interface NavigatorWithPwaApis extends Navigator {
  launchQueue?: LaunchQueue;
}

export async function initializePwaIngress(loader: PwaImageLoader): Promise<void> {
  await startPwaIngress(loader, createBrowserPort());
}

export function serviceWorkerScriptUrl(): string {
  return `/service-worker.js?version=${encodeURIComponent(appVersion)}`;
}

export async function startPwaIngress(
  loader: PwaImageLoader,
  browser: PwaBrowserPort,
): Promise<void> {
  browser.consumeLaunchFiles(async (files) => {
    const file = files[0];
    if (file) {
      await loader.loadOriginal(file);
    }
  });
  try {
    await browser.registerServiceWorker();
  } catch {
    // Installation is progressive; a blocked worker must never disable the normal browser app.
  }

  const token = browser.readSharedImageToken();
  if (!token) {
    return;
  }

  try {
    await loader.loadOriginal(await browser.fetchSharedImage(token));
  } catch {
    loader.reportError("Das geteilte Bild konnte nicht geöffnet werden. Bitte teile es erneut.");
  } finally {
    browser.removeSharedImageToken();
  }
}

function createBrowserPort(): PwaBrowserPort {
  const pwaNavigator = navigator as NavigatorWithPwaApis;
  return {
    consumeLaunchFiles(consumer): void {
      pwaNavigator.launchQueue?.setConsumer((params) => {
        // Chrome owns these handles; resolve them only when it launches the installed app.
        void Promise.all(params.files.slice(0, 1).map((handle) => handle.getFile())).then(consumer);
      });
    },
    async fetchSharedImage(token): Promise<File> {
      const response = await fetch(`${sharedImageRoute}${encodeURIComponent(token)}`);
      if (!response.ok) {
        throw new Error(`Shared image request failed with status ${String(response.status)}.`);
      }
      const blob = await response.blob();
      return new File([blob], readSharedFileName(response), { type: blob.type });
    },
    readSharedImageToken(): string | undefined {
      return new URL(window.location.href).searchParams.get(sharedImageParameter) ?? undefined;
    },
    async registerServiceWorker(): Promise<void> {
      if ("serviceWorker" in pwaNavigator) {
        await pwaNavigator.serviceWorker.register(serviceWorkerScriptUrl(), { scope: "/" });
      }
    },
    removeSharedImageToken(): void {
      const url = new URL(window.location.href);
      url.searchParams.delete(sharedImageParameter);
      window.history.replaceState(window.history.state, "", url);
    },
  };
}

function readSharedFileName(response: Response): string {
  const encodedName = response.headers.get("X-Img2svg-File-Name");
  if (!encodedName) {
    return "geteiltes-bild";
  }
  try {
    return decodeURIComponent(encodedName);
  } catch {
    return "geteiltes-bild";
  }
}
