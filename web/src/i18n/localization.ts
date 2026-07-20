export type StudioLanguage = "de" | "en";

const storageKey = "img2svg-language";
const translatedAttributes = ["alt", "aria-label", "content", "placeholder", "title"] as const;

const englishText: Readonly<Record<string, string>> = Object.freeze({
  "− Hintergrund": "− Background",
  "+ Vordergrund": "+ Foreground",
  "A/B Vergleich": "A/B Compare",
  "A/B-Trenner verschieben": "Move A/B divider",
  "AI-Ergebnis": "AI result",
  An: "On",
  Abbrechen: "Cancel",
  Anwenden: "Apply",
  Anwendungsstatus: "Application status",
  Ansichtsmodus: "View mode",
  Arbeitsfläche: "Workspace",
  Aus: "Off",
  Ausgewogen: "Balanced",
  Bereit: "Ready",
  Benutzerdefiniert: "Custom",
  "Bild wählen": "Choose image",
  "Das Bild ist beschädigt oder kann nicht gelesen werden.":
    "The image is damaged or cannot be read.",
  "Das Bild ist größer als 25 MB. Bitte wähle eine kleinere Datei.":
    "The image is larger than 25 MB. Please choose a smaller file.",
  "Das geteilte Bild konnte nicht geöffnet werden. Bitte teile es erneut.":
    "The shared image could not be opened. Please share it again.",
  "Der Hintergrund konnte nicht entfernt werden.": "The background could not be removed.",
  "Der Verlauf ist noch leer": "History is empty",
  Detailfilter: "Detail filter",
  "Die Bilddaten passen nicht zu den Bildmaßen.":
    "The image data does not match the image dimensions.",
  "Die Bildmaße sind ungültig.": "The image dimensions are invalid.",
  "Die Engine hat kein gültiges SVG erzeugt.": "The engine did not produce a valid SVG.",
  "Die Konvertierungseinstellungen sind ungültig.": "The conversion settings are invalid.",
  Downloadfortschritt: "download progress",
  Ein: "On",
  Eingabe: "Input",
  Eingabebild: "Input image",
  Entladen: "Unload",
  "Einstellungen übernehmen": "Apply settings",
  "Ellipse erkennen": "Detect ellipse",
  "Erneut versuchen": "Retry",
  "Erste Variante": "First variant",
  Farbe: "Color",
  Farben: "Colors",
  Farbpräzision: "Color precision",
  "Farbpräzision Wert": "Color precision value",
  Fehler: "Error",
  "Foto / detailreich": "Photo / detailed",
  "für ein lokales Bild": "for a local image",
  "Geladenes Rasterbild": "Loaded raster image",
  Glätten: "Smooth",
  Graustufen: "Grayscale",
  Hintergrund: "Background",
  "Hintergrund entfernen": "Remove background",
  "Hintergrundpunkt setzen": "Set background point",
  Illustration: "Illustration",
  "Initialisierung …": "Initializing …",
  "KI-Ergebnis": "AI result",
  "KI-Manager": "AI Manager",
  "KI-Modelle": "AI models",
  "KI-Werkzeuge": "AI tools",
  "Keine Netzwerkübertragung": "No network transfer",
  "Keine Parameterunterschiede.": "No parameter differences.",
  "Konvertiere …": "Converting …",
  Konvertieren: "Convert",
  Konvertierungsparameter: "Conversion parameters",
  "Konvertierung abgeschlossen": "Conversion complete",
  "Konvertierung fehlgeschlagen": "Conversion failed",
  "Konvertierung läuft lokal …": "Conversion running locally …",
  Kreis: "Circle",
  "Kreis erkennen": "Detect circle",
  "Kreise und Kanten erkennen": "Detect circles and edges",
  Kurven: "Curves",
  Laden: "Load",
  "Lade ein Bild und erstelle deine erste SVG-Variante.":
    "Load an image and create your first SVG variant.",
  "Logo / Icon": "Logo / icon",
  "Logo-Demo laden": "Load logo demo",
  "Lokale Verarbeitung": "Local processing",
  "Lokal · kein Upload": "Local · no upload",
  Linie: "Line",
  "Linie erkennen": "Detect line",
  Löschen: "Delete",
  "Maske invertieren": "Invert mask",
  "Maske invertiert.": "Mask inverted.",
  "Maske normal.": "Normal mask.",
  "Native Formen": "Native shapes",
  "Native Formen aktivieren": "Enable native shapes",
  "Nach der Konvertierung erscheint hier dein SVG.": "Your SVG appears here after conversion.",
  "Nicht geladen": "Not loaded",
  "Noch kein Bild": "No image yet",
  "Noch keine Varianten zum Vergleichen.": "No variants to compare yet.",
  "Nur Unterschiede": "Differences only",
  "Original ausgewählt": "Original selected",
  "Original wiederherstellen": "Restore original",
  Originalgröße: "Original size",
  Parameterunterschiede: "Parameter differences",
  Parametervergleich: "Parameter comparison",
  Pfadpräzision: "Path precision",
  "Pfadpräzision Wert": "Path precision value",
  "Bitte wähle ein PNG-, JPEG- oder WebP-Bild.": "Please choose a PNG, JPEG, or WebP image.",
  "Polygon erkennen": "Detect polygon",
  "Raster vor Tracing": "Raster before tracing",
  Raster: "raster",
  "Raster-Detailfilter": "Raster detail filter",
  "Rasterbild auswählen": "Choose raster image",
  Rasterfilter: "Raster filter",
  Rastergröße: "Raster size",
  "Rastergröße vor Tracing": "Raster size before tracing",
  "Rechteck erkennen": "Detect rectangle",
  Rechteck: "Rectangle",
  Schärfen: "Sharpen",
  Schwarzweiß: "Black and white",
  "Schwarzweiß / Laser": "Black and white / laser",
  "Schwarzweiß-Schwellwert": "Black-and-white threshold",
  "Schwarzweiß-Schwellwert Wert": "Black-and-white threshold value",
  Schwellwert: "Threshold",
  "Smart Select konnte nicht ausgeführt werden.": "Smart Select could not be run.",
  "Smart Select konnte nicht starten.": "Smart Select could not start.",
  "Smart Select ist bereits aktiv.": "Smart Select is already active.",
  "Smart Select lokal angewendet.": "Smart Select applied locally.",
  "Smart Select verworfen; Original unverändert.": "Smart Select discarded; original unchanged.",
  "Smart-Select-Maske und Punktfläche": "Smart Select mask and point area",
  "Smart-Select-Maske wird lokal angewendet …": "Applying Smart Select mask locally …",
  "Speckle-Filter": "Speckle filter",
  "Speckle-Filter Wert": "Speckle filter value",
  "SVG herunterladen": "Download SVG",
  "SVG lokal erzeugt": "SVG created locally",
  "SVG-Ausgabe": "SVG output",
  "SVG-Skalierung": "SVG scaling",
  "Synchronisierter A/B-Bildausschnitt": "Synchronized A/B viewport",
  Trennposition: "Divider position",
  "Trennposition zwischen A und B": "Divider position between A and B",
  Ungültig: "Invalid",
  Verarbeitet: "Processed",
  Vergrößern: "Zoom in",
  Verkleinern: "Zoom out",
  Verlauf: "History",
  "Varianten erscheinen nach der ersten Konvertierung.":
    "Variants appear after the first conversion.",
  Verwerfen: "Discard",
  Vordergrund: "Foreground",
  "Vordergrundpunkt setzen": "Set foreground point",
  "Vordergrundpunkte setzen; für Korrekturen auf „Hintergrund“ wechseln.":
    "Set foreground points; switch to “Background” for corrections.",
  "Vorbereitete Rastermaße": "Prepared raster dimensions",
  "Vorschau von": "Preview of",
  "Wähle später zwei Runs aus dem Verlauf.": "Choose two runs from History later.",
  "Wird entladen …": "Unloading …",
  Zielgröße: "Target size",
  Zielmaße: "Target dimensions",
  "Zweite Variante": "Second variant",
  Zoomsteuerung: "Zoom controls",
  "img2svg Studio Startseite": "img2svg Studio home",
  "PNG, JPEG oder WebP": "PNG, JPEG or WebP",
});

const englishPatterns: readonly Readonly<{
  expression: RegExp;
  replace: (...matches: string[]) => string;
}>[] = Object.freeze([
  pattern(/^(\d+) Varianten?$/, (count) => `${count} ${count === "1" ? "variant" : "variants"}`),
  pattern(/^(\d+) Pfade?$/, (count) => `${count} ${count === "1" ? "path" : "paths"}`),
  pattern(/^(\d+) Kreise?$/, (count) => `${count} ${count === "1" ? "circle" : "circles"}`),
  pattern(
    /^(\d+) Rechtecke?$/,
    (count) => `${count} ${count === "1" ? "rectangle" : "rectangles"}`,
  ),
  pattern(/^(\d+) Ellipsen?$/, (count) => `${count} ${count === "1" ? "ellipse" : "ellipses"}`),
  pattern(/^(\d+) Linien?$/, (count) => `${count} ${count === "1" ? "line" : "lines"}`),
  pattern(/^(\d+) Polygone?$/, (count) => `${count} ${count === "1" ? "polygon" : "polygons"}`),
  pattern(/^(\d+) Stellen?$/, (count) => `${count} ${count === "1" ? "decimal" : "decimals"}`),
  pattern(/^(\d+) Bit$/, (count) => `${count} bit`),
  pattern(/^(\d+),(\d+) MiB$/, (integer, fraction) => `${integer}.${fraction} MiB`),
  pattern(/^(\d+) % geladen$/, (count) => `${count}% loaded`),
  pattern(/^(\d+) px Höhe(.*)$/, (height, suffix) => `${height} px height${suffix}`),
  pattern(/^A · Variante$/, () => "A · Variant"),
  pattern(/^B · Variante$/, () => "B · Variant"),
  pattern(/^Bereit (.*)$/, (suffix) => `Ready ${suffix}`),
  pattern(/^Bereit$/, () => "Ready"),
  pattern(
    /^Einstellungen von Run (\d+) übernommen$/,
    (runId) => `Settings from run ${runId} applied`,
  ),
  pattern(/^Hintergrund lokal entfernt(.*)$/, (suffix) => `Background removed locally${suffix}`),
  pattern(
    /^Hintergrund wird lokal entfernt(.*)$/,
    (suffix) => `Removing background locally${suffix}`,
  ),
  pattern(/^Geladenes Rasterbild (.*)$/, (name) => `Loaded raster image ${name}`),
  pattern(/^KI-Ergebnis (.*)$/, (suffix) => `AI result ${suffix}`),
  pattern(/^Laden: (.*)$/, (model) => `Load: ${model}`),
  pattern(/^Entladen: (.*)$/, (model) => `Unload: ${model}`),
  pattern(/^(.*) Downloadfortschritt$/, (model) => `${model} download progress`),
  pattern(/^Erneut versuchen: (.*)$/, (model) => `Retry: ${model}`),
  pattern(
    /^Maske mit (\d+) Punkten? aktualisiert(.*)$/,
    (count, suffix) => `Mask updated with ${count} ${count === "1" ? "point" : "points"}${suffix}`,
  ),
  pattern(
    /^Maske wird mit (\d+) Punkten? verfeinert(.*)$/,
    (count, suffix) => `Refining mask with ${count} ${count === "1" ? "point" : "points"}${suffix}`,
  ),
  pattern(/^MODNet wird lokal vorbereitet(.*)$/, (suffix) => `Preparing MODNet locally${suffix}`),
  pattern(/^Original als ([AB]) setzen$/, (slot) => `Set original as ${slot}`),
  pattern(/^Run (\d+) als ([AB]) setzen$/, (runId, slot) => `Set run ${runId} as ${slot}`),
  pattern(/^Run (\d+) ausgewählt$/, (runId) => `Run ${runId} selected`),
  pattern(/^Run (\d+) gelöscht$/, (runId) => `Run ${runId} deleted`),
  pattern(/^Run (\d+) löschen$/, (runId) => `Delete run ${runId}`),
  pattern(
    /^SlimSAM berechnet das lokale Bild-Embedding(.*)$/,
    (suffix) => `SlimSAM is computing the local image embedding${suffix}`,
  ),
  pattern(/^Vordergrundpunkt (\d+)$/, (index) => `Foreground point ${index}`),
  pattern(/^Hintergrundpunkt (\d+)$/, (index) => `Background point ${index}`),
  pattern(/^Vorschau von (.*)$/, (name) => `Preview of ${name}`),
]);

const sourceText = new WeakMap<CharacterData, string>();
const renderedText = new WeakMap<CharacterData, string>();
const sourceAttributes = new WeakMap<Element, Map<string, string>>();
const renderedAttributes = new WeakMap<Element, Map<string, string>>();

export function initializeLocalization(): void {
  const selector = requireLanguageSelector();
  let language = readStoredLanguage();

  const render = (root: Node = document.documentElement): void => {
    renderNode(root, language);
    document.documentElement.lang = language;
    selector.value = language;
  };

  selector.addEventListener("change", () => {
    language = selector.value === "en" ? "en" : "de";
    localStorage.setItem(storageKey, language);
    render();
  });

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          renderNode(node, language);
        }
      } else if (mutation.type === "characterData") {
        renderCharacterData(mutation.target as CharacterData, language);
      } else if (mutation.attributeName) {
        renderAttribute(mutation.target as Element, mutation.attributeName, language);
      }
    }
  }).observe(document.documentElement, {
    attributeFilter: [...translatedAttributes],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  render();
}

export function translateGermanText(value: string): string {
  const match = /^(\s*)(.*?)(\s*)$/s.exec(value);
  if (!match) {
    return value;
  }
  const [, leading = "", content = "", trailing = ""] = match;
  return `${leading}${translateContent(content)}${trailing}`;
}

function translateContent(content: string): string {
  const exact = englishText[content];
  if (exact) {
    return exact;
  }
  if (content.includes(" · ")) {
    return content.split(" · ").map(translateContent).join(" · ");
  }
  for (const rule of englishPatterns) {
    const match = rule.expression.exec(content);
    if (match) {
      return rule.replace(...match.slice(1));
    }
  }
  return content;
}

function renderNode(root: Node, language: StudioLanguage): void {
  if (root instanceof CharacterData) {
    renderCharacterData(root, language);
    return;
  }
  if (!(root instanceof Element)) {
    return;
  }
  renderElement(root, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node instanceof CharacterData) {
      renderCharacterData(node, language);
    } else if (node instanceof Element) {
      renderElement(node, language);
    }
    node = walker.nextNode();
  }
}

function renderElement(element: Element, language: StudioLanguage): void {
  for (const attribute of translatedAttributes) {
    if (element.hasAttribute(attribute)) {
      renderAttribute(element, attribute, language);
    }
  }
}

function renderCharacterData(node: CharacterData, language: StudioLanguage): void {
  const previous = renderedText.get(node);
  if (!sourceText.has(node) || node.data !== previous) {
    sourceText.set(node, node.data);
  }
  const source = sourceText.get(node) ?? node.data;
  const rendered = language === "en" ? translateGermanText(source) : source;
  renderedText.set(node, rendered);
  if (node.data !== rendered) {
    node.data = rendered;
  }
}

function renderAttribute(element: Element, attribute: string, language: StudioLanguage): void {
  const value = element.getAttribute(attribute);
  if (value === null) {
    return;
  }
  const sources = sourceAttributes.get(element) ?? new Map<string, string>();
  const renderedValues = renderedAttributes.get(element) ?? new Map<string, string>();
  if (!sources.has(attribute) || value !== renderedValues.get(attribute)) {
    sources.set(attribute, value);
  }
  const source = sources.get(attribute) ?? value;
  const rendered = language === "en" ? translateGermanText(source) : source;
  sourceAttributes.set(element, sources);
  renderedAttributes.set(element, renderedValues.set(attribute, rendered));
  if (value !== rendered) {
    element.setAttribute(attribute, rendered);
  }
}

function readStoredLanguage(): StudioLanguage {
  return localStorage.getItem(storageKey) === "en" ? "en" : "de";
}

function requireLanguageSelector(): HTMLSelectElement {
  const selector = document.querySelector("#language-select");
  if (!(selector instanceof HTMLSelectElement)) {
    throw new Error("Required language selector is missing.");
  }
  return selector;
}

function pattern(
  expression: RegExp,
  replace: (...matches: string[]) => string,
): Readonly<{ expression: RegExp; replace: (...matches: string[]) => string }> {
  return Object.freeze({ expression, replace });
}
