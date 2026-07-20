const languageStorageKey = "img2svg-language";
const languageSelect = document.querySelector("#legal-language");
const languageSections = document.querySelectorAll("[data-legal-language]");
const translatedElements = document.querySelectorAll("[data-de][data-en]");
const translatedLabels = document.querySelectorAll("[data-aria-de][data-aria-en]");

function readLanguage() {
  try {
    return localStorage.getItem(languageStorageKey) === "en" ? "en" : "de";
  } catch {
    return "de";
  }
}

function showLanguage(language) {
  document.documentElement.lang = language;

  for (const section of languageSections) {
    section.hidden = section.dataset.legalLanguage !== language;
  }

  for (const element of translatedElements) {
    element.textContent = element.dataset[language];
  }

  for (const element of translatedLabels) {
    element.setAttribute("aria-label", element.dataset[`aria${language === "de" ? "De" : "En"}`]);
  }

  const heading = document.querySelector(`[data-legal-language="${language}"] h1`);
  if (heading instanceof HTMLHeadingElement) {
    document.title = `${heading.textContent} · img2svg Studio`;
  }

  if (languageSelect instanceof HTMLSelectElement) {
    languageSelect.value = language;
  }
}

if (languageSelect instanceof HTMLSelectElement) {
  languageSelect.addEventListener("change", () => {
    const language = languageSelect.value === "en" ? "en" : "de";
    try {
      localStorage.setItem(languageStorageKey, language);
    } catch {
      // The selected language still applies when private browsing blocks persistence.
    }
    showLanguage(language);
  });
}

showLanguage(readLanguage());
