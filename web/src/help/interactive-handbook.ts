interface HelpTopic {
  readonly defaultValue?: string;
  readonly description: string;
  readonly effect: string;
  readonly title: string;
}

export interface InteractiveHandbookController {
  showTopic(key: string, target?: HTMLElement): boolean;
}

const helpTopics: Readonly<Record<string, HelpTopic>> = Object.freeze({
  accept: topic(
    "Variante übernehmen",
    "Speichert genau die aktuell sichtbare Vorschau als unveränderlichen Run im Verlauf.",
    "Der sichtbare Entwurf wird ersetzt; erst die Übernahme erzeugt eine gespeicherte Variante.",
  ),
  colorPrecision: topic(
    "Farbpräzision",
    "Legt fest, wie viele Bits jedes RGB-Farbkanals für die Clusterbildung unterscheiden.",
    "Niedriger fasst ähnliche Farben zusammen und erzeugt meist weniger Pfade; höher erhält mehr Farbabstufungen.",
    "6 Bit",
  ),
  colors: topic(
    "Farben",
    "Steuert, wie fein VTracer ähnliche Rasterfarben voneinander trennt.",
    "Für Logos zuerst die Farbpräzision senken; das reduziert häufig Pfade und Dateigröße.",
  ),
  cornerThreshold: topic(
    "Eckenwinkel",
    "Mindestwinkel in Grad, ab dem der Spline-Modus eine Richtungsänderung als Ecke behandelt.",
    "Kleinere Werte erhalten mehr Ecken; größere Werte glätten den Verlauf stärker. Wirkt nur im Spline-Modus.",
    "60°",
  ),
  curveFitting: topic(
    "Kurvenmodus",
    "Wählt zwischen Pixelkontur, vereinfachten Polygonen und geglätteten Bézier-Splines.",
    "Pixel ist am genauesten und größten, Polygon kantig und kompakt, Spline meist der beste allgemeine Kompromiss.",
    "Spline",
  ),
  filterSpeckle: topic(
    "Speckle-Filter",
    "Entfernt Farbflächen, deren Seitenmaß kleiner als der gewählte Pixelwert ist.",
    "Höher reduziert Rauschen, Pfade und Dateigröße, kann aber kleine gewünschte Details löschen.",
    "4 px",
  ),
  hierarchical: topic(
    "Überlagerung",
    "Bestimmt, ob Farbflächen übereinander gestapelt oder als aneinanderliegende Ausschnitte erzeugt werden.",
    "Gestapelt ist robuster; Ausschnitte vermeiden verdeckte Flächen und können für Plotter oder Fräsen geeigneter sein.",
    "Gestapelt",
  ),
  layerDifference: topic(
    "Verlaufsschritt",
    "Bestimmt den Farbunterschied zwischen aufeinanderfolgenden Verlaufsebenen.",
    "Höher erzeugt gröbere Farbstufen und oft weniger Pfade. Null aktiviert diagonale Clusterverbindungen.",
    "16",
  ),
  magicWand: topic(
    "Zauberstab",
    "Wählt nach einem Klick nur den zusammenhängenden Bereich mit ähnlicher Farbe aus.",
    "Die Empfindlichkeit erweitert die sichtbare Maske; entfernt wird sie erst nach ausdrücklicher Bestätigung.",
    "15 %",
  ),
  lengthThreshold: topic(
    "Segmentlänge",
    "Glättet iterativ, bis die Kurvensegmente kürzer als dieser Pixelwert sind.",
    "Kleinere Werte folgen Konturen genauer und erzeugen mehr Kurvenpunkte. Wirkt nur im Spline-Modus.",
    "4,0 px",
  ),
  maxIterations: topic(
    "Glättungsdurchläufe",
    "Begrenzt, wie oft VTracer lange Kurvensegmente weiter unterteilt.",
    "Mehr Durchläufe können komplexe Konturen genauer glätten, kosten aber Rechenzeit. Wirkt nur im Spline-Modus.",
    "10",
  ),
  monochromeThreshold: topic(
    "Schwarzweiß-Schwellwert",
    "Trennt beim Schwarzweiß-Filter dunkle und helle Rasterpixel.",
    "Höher ordnet mehr Pixel Schwarz zu; niedriger erhält nur die dunkelsten Bereiche.",
    "128",
  ),
  pathPrecision: topic(
    "Pfadpräzision",
    "Legt die Dezimalstellen der Koordinaten im SVG-Pfad fest.",
    "Weniger Stellen verkleinern die Datei ohne die Pfadanzahl zu ändern; bei kleinen Motiven kann starkes Runden sichtbar werden.",
    "2 Stellen",
  ),
  preprocessing: topic(
    "Raster vor Tracing",
    "Bereitet die tatsächlichen Pixel vor, bevor VTracer sie erhält.",
    "Größe und Filter können die spätere Pfadanzahl stärker beeinflussen als einzelne Kurvenparameter.",
  ),
  preset: topic(
    "Preset",
    "Setzt mehrere Raster-, VTracer- und Formerkennungswerte gemeinsam auf ein erprobtes Profil.",
    "Nach einer eigenen Änderung erscheint Benutzerdefiniert. Standardwerte stellt der Knopf im VTracer-Bereich wieder her.",
    "Ausgewogen",
  ),
  rasterDetail: topic(
    "Detailfilter",
    "Glättet Rauschen oder schärft Kanten im Raster unmittelbar vor dem Tracing.",
    "Glätten reduziert oft kleine Cluster; Schärfen kann schwache Kanten erhalten, aber zusätzliche Pfade erzeugen.",
    "Aus",
  ),
  rasterFilter: topic(
    "Rasterfilter",
    "Übergibt Farbe, Graustufen oder reines Schwarzweiß an VTracer.",
    "Graustufen entfernt Farbinformation; Schwarzweiß eignet sich für klare Konturen, Laser und Fräsen.",
    "Farbe",
  ),
  rasterResize: topic(
    "Rastergröße",
    "Ändert die Pixelauflösung vor dem Tracing bei festem Seitenverhältnis.",
    "Kleinere Raster vereinfachen Details und sparen Pfade; größere Raster können feine Kanten besser erfassen.",
    "Originalgröße",
  ),
  scalePercent: topic(
    "SVG-Skalierung",
    "Ändert Ausgabegröße und Koordinatensystem des SVG nach der Rastervorbereitung.",
    "Dieser Wert verändert nicht die Pixel, die VTracer analysiert. Dafür dient die Rastergröße.",
    "Original · 100 %",
  ),
  shapeDetection: topic(
    "Native Formen",
    "Ersetzt passende VTracer-Konturen durch native SVG-Kreise, Rechtecke, Ellipsen, Linien oder Polygone.",
    "Der Hauptschalter aktiviert die Erkennung; die einzelnen Typen begrenzen, welche Formen ersetzt werden dürfen.",
    "Aus",
  ),
  shapeCircle: shapeTypeTopic("Kreis erkennen"),
  shapeEllipse: shapeTypeTopic("Ellipse erkennen"),
  shapeLine: shapeTypeTopic("Linie erkennen"),
  shapePolygon: shapeTypeTopic("Polygon erkennen"),
  shapeRectangle: shapeTypeTopic("Rechteck erkennen"),
  source: topic(
    "Eingabebild",
    "Lädt ein lokales PNG-, JPEG- oder WebP-Bild oder das mitgelieferte Logo-Beispiel.",
    "Das Bild bleibt im Browser; die Live-Vorschau erscheint automatisch als B gegen Original A.",
  ),
  spliceThreshold: topic(
    "Verbindungswinkel",
    "Mindeständerung des Winkels, ab der benachbarte Spline-Abschnitte getrennt werden.",
    "Kleinere Werte erzeugen mehr getrennte Kurvenabschnitte; größere verbinden stärker. Wirkt nur im Spline-Modus.",
    "45°",
  ),
  svgOutput: topic(
    "SVG-Ausgabe",
    "Bündelt Profil, Ausgabegröße und die daraus berechneten Zielmaße.",
    "Die Rastergröße steuert die Analyse; die SVG-Skalierung steuert die endgültige Ausgabegröße.",
  ),
  tracing: topic(
    "VTracer",
    "Stellt alle zehn im farbigen Tracing-Pfad verwendeten VTracer-Parameter bereit.",
    "Jede Änderung aktualisiert die sichtbare Vorschau automatisch; Standardwerte setzt nur diesen Bereich zurück.",
  ),
});

function shapeTypeTopic(title: string): HelpTopic {
  return topic(
    title,
    "Erlaubt, geeignete Konturen dieses Typs als natives SVG-Element auszugeben.",
    "Wirkt nur bei aktivierter Formerkennung; ausgeschaltet bleibt die Kontur ein VTracer-Pfad.",
    "Ein",
  );
}

export function initializeInteractiveHandbook(): InteractiveHandbookController {
  const elements = readElements();
  let enabled = true;
  let highlighted: HTMLElement | undefined;

  elements.open.addEventListener("click", () => setOpen(elements.drawer.hasAttribute("hidden")));
  elements.close.addEventListener("click", () => setOpen(false));
  elements.contextToggle.addEventListener("click", () => {
    enabled = !enabled;
    elements.contextToggle.setAttribute("aria-checked", String(enabled));
    document.documentElement.classList.toggle("context-help-enabled", enabled);
    if (!enabled) {
      highlighted?.classList.remove("help-target-active");
      highlighted = undefined;
    }
  });
  document.addEventListener("pointerover", (event) => renderFromTarget(event.target));
  document.addEventListener("focusin", (event) => renderFromTarget(event.target));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.drawer.hidden) {
      setOpen(false);
      elements.open.focus();
    }
  });
  elements.index.replaceChildren(...createIndexEntries());

  const controller: InteractiveHandbookController = Object.freeze({
    showTopic: (key: string, target?: HTMLElement) => {
      if (!helpTopics[key]) {
        return false;
      }
      setOpen(true);
      renderTopic(key, target);
      // Opening the drawer shifts controls and may synthesize hover over another topic.
      requestAnimationFrame(() => renderTopic(key, target));
      return true;
    },
  });

  function setOpen(open: boolean): void {
    elements.drawer.hidden = !open;
    elements.open.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("handbook-open", open);
    if (open) {
      document.documentElement.classList.toggle("context-help-enabled", enabled);
    }
  }

  function renderFromTarget(target: EventTarget | null): void {
    if (!enabled || elements.drawer.hidden || !(target instanceof Element)) {
      return;
    }
    const helpTarget = target.closest<HTMLElement>("[data-help-key]");
    const key = helpTarget?.dataset.helpKey;
    if (!key || !helpTopics[key] || !helpTarget) {
      return;
    }
    renderTopic(key, helpTarget);
  }

  function renderTopic(key: string, helpTarget?: HTMLElement): void {
    const selected = helpTopics[key];
    if (!selected) {
      return;
    }
    highlighted?.classList.remove("help-target-active");
    highlighted = helpTarget;
    highlighted?.classList.add("help-target-active");
    elements.title.textContent = selected.title;
    elements.description.textContent = selected.description;
    elements.effect.textContent = selected.effect;
    elements.defaultValue.textContent = selected.defaultValue
      ? `Standard: ${selected.defaultValue}`
      : "";
  }

  return controller;
}

function createIndexEntries(): HTMLElement[] {
  return Object.values(helpTopics).map((entry) => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = entry.title;
    const description = document.createElement("p");
    description.textContent = entry.description;
    const effect = document.createElement("p");
    effect.textContent = entry.effect;
    details.append(summary, description, effect);
    if (entry.defaultValue) {
      const defaultValue = document.createElement("p");
      defaultValue.className = "context-help-default";
      defaultValue.textContent = `Standard: ${entry.defaultValue}`;
      details.append(defaultValue);
    }
    return details;
  });
}

function topic(
  title: string,
  description: string,
  effect: string,
  defaultValue?: string,
): HelpTopic {
  return Object.freeze({ defaultValue, description, effect, title });
}

function readElements(): {
  close: HTMLButtonElement;
  contextToggle: HTMLButtonElement;
  defaultValue: HTMLElement;
  description: HTMLElement;
  drawer: HTMLElement;
  effect: HTMLElement;
  index: HTMLElement;
  open: HTMLButtonElement;
  title: HTMLElement;
} {
  return {
    close: requireElement("#handbook-close", HTMLButtonElement),
    contextToggle: requireElement("#context-help-toggle", HTMLButtonElement),
    defaultValue: requireElement("#context-help-default", HTMLElement),
    description: requireElement("#context-help-description", HTMLElement),
    drawer: requireElement("#handbook-drawer", HTMLElement),
    effect: requireElement("#context-help-effect", HTMLElement),
    index: requireElement("#handbook-index", HTMLElement),
    open: requireElement("#handbook-toggle", HTMLButtonElement),
    title: requireElement("#context-help-title", HTMLElement),
  };
}

interface ElementConstructor<ElementType extends Element> {
  new (): ElementType;
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: ElementConstructor<ElementType>,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required handbook element is missing: ${selector}`);
  }
  return element;
}
