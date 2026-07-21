export const appVersion = "260721.16" as const;

export const versionedAssetFileNames = Object.freeze({
  asset: `assets/[name]-v${appVersion}-[hash][extname]`,
  chunk: `assets/[name]-v${appVersion}-[hash].js`,
  entry: `assets/[name]-v${appVersion}-[hash].js`,
});

export function showAppVersion(): void {
  const output = document.querySelector("#app-version");
  if (!(output instanceof HTMLOutputElement)) {
    throw new Error("Required app version output is missing.");
  }
  output.textContent = appVersion;
  document.documentElement.dataset.appVersion = appVersion;
}
