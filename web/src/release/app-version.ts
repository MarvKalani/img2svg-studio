export const appVersion = "260720.02" as const;

export function showAppVersion(): void {
  const output = document.querySelector("#app-version");
  if (!(output instanceof HTMLOutputElement)) {
    throw new Error("Required app version output is missing.");
  }
  output.textContent = appVersion;
  document.documentElement.dataset.appVersion = appVersion;
}
