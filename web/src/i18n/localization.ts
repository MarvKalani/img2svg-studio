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
  "Auswahl entfernen": "Remove selection",
  "Auswahl wird lokal entfernt …": "Removing selection locally …",
  Anwendungsstatus: "Application status",
  Ansichtsmodus: "View mode",
  Arbeitsfläche: "Workspace",
  Aus: "Off",
  Ausgewogen: "Balanced",
  Bereit: "Ready",
  Bearbeitet: "Edited",
  Benutzerdefiniert: "Custom",
  "Bild wählen": "Choose image",
  "Das Bild ist beschädigt oder kann nicht gelesen werden.":
    "The image is damaged or cannot be read.",
  "Das Bild ist größer als 25 MB. Bitte wähle eine kleinere Datei.":
    "The image is larger than 25 MB. Please choose a smaller file.",
  "Das Zauberstab-Ergebnis konnte nicht angezeigt werden.":
    "The Magic Wand result could not be displayed.",
  "Das geteilte Bild konnte nicht geöffnet werden. Bitte teile es erneut.":
    "The shared image could not be opened. Please share it again.",
  "Der Hintergrund konnte nicht entfernt werden.": "The background could not be removed.",
  "Der Browser konnte das bearbeitete Bild nicht als PNG speichern.":
    "The browser could not save the edited image as PNG.",
  "Der Zauberstab konnte nicht ausgeführt werden.": "The Magic Wand could not be run.",
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
  Empfindlichkeit: "Sensitivity",
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
  Glättungsstärke: "Smoothing strength",
  Graustufen: "Grayscale",
  Hintergrund: "Background",
  "Hintergrund entfernen": "Remove background",
  "Hintergrundpunkt setzen": "Set background point",
  Illustration: "Illustration",
  Impressum: "Legal notice",
  "Initialisierung …": "Initializing …",
  "KI-Ergebnis": "AI result",
  "KI-Manager": "AI Manager",
  "KI-Modelle": "AI models",
  "KI-Werkzeuge": "AI tools",
  "Klicke auf den zusammenhängenden Farbbereich, den du entfernen möchtest.":
    "Click the contiguous color region you want to remove.",
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
  Lizenzen: "Licenses",
  Laden: "Load",
  "Lade ein Bild und übernimm deine erste SVG-Variante.":
    "Load an image and accept your first SVG variant.",
  "Logo / Icon": "Logo / icon",
  "Logo-Demo laden": "Load logo demo",
  "Topografie-Demo laden": "Load topography demo",
  "Topografie / Konturen": "Topography / contours",
  "Lokale Verarbeitung": "Local processing",
  "Lokal · kein Upload": "Local · no upload",
  Linie: "Line",
  "Linie erkennen": "Detect line",
  Löschen: "Delete",
  "Maske invertieren": "Invert mask",
  "Maske invertiert.": "Mask inverted.",
  "Maske normal.": "Normal mask.",
  "Manuelle Auswahl": "Manual selection",
  "Native Formen": "Native shapes",
  "Native Formen aktivieren": "Enable native shapes",
  "Nach dem Laden erscheint hier automatisch dein SVG.":
    "Your SVG appears here automatically after loading.",
  "Nicht geladen": "Not loaded",
  "Im Verlauf gespeichert": "Saved to History",
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
  "Raster vorbereiten": "Preparing raster",
  "Raster-Detailfilter": "Raster detail filter",
  "Rasterbild auswählen": "Choose raster image",
  Rasterfilter: "Raster filter",
  Rastergröße: "Raster size",
  "Rastergröße vor Tracing": "Raster size before tracing",
  "Rechteck erkennen": "Detect rectangle",
  Rechteck: "Rectangle",
  "Rechtliche Informationen": "Legal information",
  Schärfen: "Sharpen",
  Schärfungsstärke: "Sharpening strength",
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
  "SVG-Konturen erzeugen": "Creating SVG contours",
  "SVG-Ausgabe": "SVG output",
  "SVG-Skalierung": "SVG scaling",
  "Synchronisierter A/B-Bildausschnitt": "Synchronized A/B viewport",
  Trennposition: "Divider position",
  "Tracing-Fortschritt": "Tracing progress",
  "Trennposition zwischen A und B": "Divider position between A and B",
  Ungültig: "Invalid",
  Verarbeitet: "Processed",
  Vergrößern: "Zoom in",
  Verkleinern: "Zoom out",
  Verlauf: "History",
  "Varianten erscheinen nach der ersten Übernahme.": "Variants appear after the first acceptance.",
  "Variante übernehmen": "Accept variant",
  Verwerfen: "Discard",
  Vordergrund: "Foreground",
  "Vordergrundpunkt setzen": "Set foreground point",
  "Vordergrundpunkte setzen; für Korrekturen auf „Hintergrund“ wechseln.":
    "Set foreground points; switch to “Background” for corrections.",
  "Vorbereitete Rastermaße": "Prepared raster dimensions",
  "Vorschau von": "Preview of",
  "Vorschau fehlgeschlagen": "Preview failed",
  "Vorschau wird aktualisiert …": "Updating preview …",
  "Vorschau wird lokal aktualisiert …": "Updating preview locally …",
  "Wähle später zwei Runs aus dem Verlauf.": "Choose two runs from History later.",
  "Wird entladen …": "Unloading …",
  Datenschutz: "Privacy",
  Zielgröße: "Target size",
  Zielmaße: "Target dimensions",
  Zauberstab: "Magic Wand",
  "Zauberstab-Auswahl": "Magic Wand selection",
  "Zauberstab-Auswahl lokal entfernt.": "Magic Wand selection removed locally.",
  "Zauberstab-Empfindlichkeit": "Magic Wand sensitivity",
  "Zauberstab-Maske und Auswahlfläche": "Magic Wand mask and selection area",
  "Zauberstab verworfen; Bild unverändert.": "Magic Wand discarded; image unchanged.",
  "Zauberstab wird vorbereitet …": "Preparing Magic Wand …",
  "Raster bearbeiten": "Edit raster",
  "Farbflächen erkennen": "Detecting color areas",
  "Ausschnitte aufbereiten": "Preparing cutouts",
  "Direkte Pixelwerkzeuge für Original und Verarbeitet":
    "Direct pixel tools for Original and Processed views",
  Entwurf: "Draft",
  "Entwurf · ungespeichert": "Draft · unsaved",
  "Zusammenhängende Farbe entfernen": "Remove contiguous color",
  "Zweite Variante": "Second variant",
  Zoomsteuerung: "Zoom controls",
  "img2svg Studio Startseite": "img2svg Studio home",
  "PNG, JPEG oder WebP": "PNG, JPEG or WebP",
  "Alle Parameter": "All parameters",
  "Bedienelement auswählen": "Select a control",
  Eckenwinkel: "Corner threshold",
  "Erweiterte Parameter": "Advanced parameters",
  "Fahre mit der Maus über einen Parameter oder fokussiere ihn mit der Tastatur.":
    "Hover over a parameter or focus it with the keyboard.",
  Gestapelt: "Stacked",
  Glättungsdurchläufe: "Smoothing iterations",
  Handbuch: "Handbook",
  "Handbuch schließen": "Close handbook",
  "Hilfe beim Überfahren": "Help on hover",
  "Interaktives Handbuch": "Interactive handbook",
  Kontexthilfe: "Context help",
  Kontextaktionen: "Context actions",
  "Im Handbuch erklären": "Explain in handbook",
  "Auf Standard zurücksetzen": "Reset to default",
  "Original öffnen": "Open original",
  "SVG anzeigen": "Show SVG",
  "Entwurf übernehmen": "Accept draft",
  Kurvenmodus: "Curve mode",
  Pixel: "Pixel",
  Segmentlänge: "Segment length",
  Spline: "Spline",
  Standardwerte: "Defaults",
  Verbindungswinkel: "Splice threshold",
  Verlaufsschritt: "Gradient step",
  Überlagerung: "Layering",
  Ausschnitte: "Cutout",
  "VTracer-Kurvenmodus": "VTracer curve mode",
  "VTracer-Überlagerung": "VTracer layering",
  "VTracer-Eckenwinkel": "VTracer corner threshold",
  "VTracer-Glättungsdurchläufe": "VTracer smoothing iterations",
  "VTracer-Segmentlänge": "VTracer segment length",
  "VTracer-Verbindungswinkel": "VTracer splice threshold",
  "VTracer-Verlaufsschritt": "VTracer gradient step",
  "Zeigt die Erklärung des Elements unter der Maus.":
    "Shows the explanation for the element under the pointer.",
  "Ersetzt passende VTracer-Konturen durch native SVG-Kreise, Rechtecke, Ellipsen, Linien oder Polygone.":
    "Replaces matching VTracer contours with native SVG circles, rectangles, ellipses, lines, or polygons.",
  "Der Hauptschalter aktiviert die Erkennung; die einzelnen Typen begrenzen, welche Formen ersetzt werden dürfen.":
    "The main switch enables detection; individual types limit which shapes may be replaced.",
  "Erlaubt, geeignete Konturen dieses Typs als natives SVG-Element auszugeben.":
    "Allows suitable contours of this type to be emitted as a native SVG element.",
  "Wirkt nur bei aktivierter Formerkennung; ausgeschaltet bleibt die Kontur ein VTracer-Pfad.":
    "Only applies while native-shape detection is enabled; otherwise the contour remains a VTracer path.",
  "Der sichtbare Entwurf wird ersetzt; erst die Übernahme erzeugt eine gespeicherte Variante.":
    "The visible draft is replaced; only acceptance creates a saved variant.",
  "Speichert genau die aktuell sichtbare Vorschau als unveränderlichen Run im Verlauf.":
    "Saves exactly the currently visible preview as an immutable History run.",
  "Legt fest, wie viele Bits jedes RGB-Farbkanals für die Clusterbildung unterscheiden.":
    "Sets how many bits of each RGB channel are distinguished during clustering.",
  "Niedriger fasst ähnliche Farben zusammen und erzeugt meist weniger Pfade; höher erhält mehr Farbabstufungen.":
    "Lower values merge similar colors and usually create fewer paths; higher values preserve more color shades.",
  "Entfernt Farbflächen, deren Seitenmaß kleiner als der gewählte Pixelwert ist.":
    "Removes color areas whose side length is smaller than the selected pixel value.",
  "Höher reduziert Rauschen, Pfade und Dateigröße, kann aber kleine gewünschte Details löschen.":
    "Higher values reduce noise, paths, and file size, but may remove small desired details.",
  "Legt die Dezimalstellen der Koordinaten im SVG-Pfad fest.":
    "Sets the number of decimal places for coordinates in the SVG path.",
  "Weniger Stellen verkleinern die Datei ohne die Pfadanzahl zu ändern; bei kleinen Motiven kann starkes Runden sichtbar werden.":
    "Fewer decimals reduce file size without changing path count; strong rounding can become visible in small artwork.",
  "Bestimmt, ob Farbflächen übereinander gestapelt oder als aneinanderliegende Ausschnitte erzeugt werden.":
    "Determines whether color areas are stacked or created as adjacent cutouts.",
  "Gestapelt ist robuster; Ausschnitte vermeiden verdeckte Flächen und können für Plotter oder Fräsen geeigneter sein.":
    "Stacked is more robust; cutouts avoid hidden areas and may suit plotters or milling better.",
  "Wählt zwischen Pixelkontur, vereinfachten Polygonen und geglätteten Bézier-Splines.":
    "Chooses between pixel contours, simplified polygons, and smoothed Bézier splines.",
  "Pixel ist am genauesten und größten, Polygon kantig und kompakt, Spline meist der beste allgemeine Kompromiss.":
    "Pixel is most exact and largest, polygon is angular and compact, and spline is usually the best general compromise.",
  "Bestimmt den Farbunterschied zwischen aufeinanderfolgenden Verlaufsebenen.":
    "Sets the color difference between consecutive gradient layers.",
  "Höher erzeugt gröbere Farbstufen und oft weniger Pfade. Null aktiviert diagonale Clusterverbindungen.":
    "Higher values create coarser color steps and often fewer paths. Zero enables diagonal cluster connections.",
  "Mindestwinkel in Grad, ab dem der Spline-Modus eine Richtungsänderung als Ecke behandelt.":
    "Minimum angle in degrees at which spline mode treats a direction change as a corner.",
  "Kleinere Werte erhalten mehr Ecken; größere Werte glätten den Verlauf stärker. Wirkt nur im Spline-Modus.":
    "Lower values preserve more corners; higher values smooth more strongly. Only affects spline mode.",
  "Glättet iterativ, bis die Kurvensegmente kürzer als dieser Pixelwert sind.":
    "Smooths iteratively until curve segments are shorter than this pixel value.",
  "Kleinere Werte folgen Konturen genauer und erzeugen mehr Kurvenpunkte. Wirkt nur im Spline-Modus.":
    "Lower values follow contours more closely and create more curve points. Only affects spline mode.",
  "Begrenzt, wie oft VTracer lange Kurvensegmente weiter unterteilt.":
    "Limits how often VTracer subdivides long curve segments.",
  "Mehr Durchläufe können komplexe Konturen genauer glätten, kosten aber Rechenzeit. Wirkt nur im Spline-Modus.":
    "More iterations can smooth complex contours more precisely but cost processing time. Only affects spline mode.",
  "Mindeständerung des Winkels, ab der benachbarte Spline-Abschnitte getrennt werden.":
    "Minimum angular change at which adjacent spline sections are separated.",
  "Kleinere Werte erzeugen mehr getrennte Kurvenabschnitte; größere verbinden stärker. Wirkt nur im Spline-Modus.":
    "Lower values create more separate curve sections; higher values join more. Only affects spline mode.",
  "Stellt alle zehn im farbigen Tracing-Pfad verwendeten VTracer-Parameter bereit.":
    "Provides all ten VTracer parameters used by the color tracing path.",
  "Jede Änderung aktualisiert die sichtbare Vorschau automatisch; Standardwerte setzt nur diesen Bereich zurück.":
    "Every change updates the visible preview automatically; Defaults resets only this section.",
  "Aktuelles Element": "Current element",
  "Steuert, wie fein VTracer ähnliche Rasterfarben voneinander trennt.":
    "Controls how finely VTracer separates similar raster colors.",
  "Für Logos zuerst die Farbpräzision senken; das reduziert häufig Pfade und Dateigröße.":
    "For logos, lower color precision first; this often reduces paths and file size.",
  "Bereitet die tatsächlichen Pixel vor, bevor VTracer sie erhält.":
    "Prepares the actual pixels before VTracer receives them.",
  "Größe und Filter können die spätere Pfadanzahl stärker beeinflussen als einzelne Kurvenparameter.":
    "Size and filters can affect the final path count more than individual curve parameters.",
  "Setzt mehrere Raster-, VTracer- und Formerkennungswerte gemeinsam auf ein erprobtes Profil.":
    "Sets multiple raster, VTracer, and shape-recognition values to a proven profile.",
  "Nach einer eigenen Änderung erscheint Benutzerdefiniert. Standardwerte stellt der Knopf im VTracer-Bereich wieder her.":
    "After a manual change, Custom appears. The button in the VTracer section restores its defaults.",
  "Verstärkt Hauptkanten nach der optionalen Glättung mit einer dosierten Unscharfmaske.":
    "Strengthens main edges after optional smoothing with a controlled unsharp mask.",
  "Höhere Werte erhalten schwache Kanten, können aber zusätzliche Pfade und Kantenartefakte erzeugen.":
    "Higher values preserve weak edges but can create extra paths and edge artifacts.",
  "Mischt das Raster dosiert mit einem kleinen 3×3-Gaußfilter.":
    "Blends the raster with a small 3×3 Gaussian filter at the selected strength.",
  "Höhere Werte reduzieren JPEG-Rauschen und kleine Cluster. Schärfen wird danach angewendet.":
    "Higher values reduce JPEG noise and small clusters. Sharpening is applied afterward.",
  "Übergibt Farbe, Graustufen oder reines Schwarzweiß an VTracer.":
    "Passes color, grayscale, or pure black and white to VTracer.",
  "Graustufen entfernt Farbinformation; Schwarzweiß eignet sich für klare Konturen, Laser und Fräsen.":
    "Grayscale removes color information; black and white suits clear contours, lasers, and milling.",
  "Ändert die Pixelauflösung vor dem Tracing bei festem Seitenverhältnis.":
    "Changes pixel resolution before tracing while preserving aspect ratio.",
  "Kleinere Raster vereinfachen Details und sparen Pfade; größere Raster können feine Kanten besser erfassen.":
    "Smaller rasters simplify detail and save paths; larger rasters can capture fine edges better.",
  "Ändert Ausgabegröße und Koordinatensystem des SVG nach der Rastervorbereitung.":
    "Changes SVG output size and coordinate system after raster preparation.",
  "Dieser Wert verändert nicht die Pixel, die VTracer analysiert. Dafür dient die Rastergröße.":
    "This value does not change the pixels VTracer analyzes. Raster size does that.",
  "Lädt ein lokales PNG-, JPEG- oder WebP-Bild oder das mitgelieferte Logo-Beispiel.":
    "Loads a local PNG, JPEG, or WebP image or the bundled logo example.",
  "Das Bild bleibt im Browser; die Live-Vorschau erscheint automatisch als B gegen Original A.":
    "The image stays in the browser; the live preview automatically appears as B against original A.",
  "Wählt nach einem Klick nur den zusammenhängenden Bereich mit ähnlicher Farbe aus.":
    "After one click, selects only the contiguous region with a similar color.",
  "Die Empfindlichkeit erweitert die sichtbare Maske; entfernt wird sie erst nach ausdrücklicher Bestätigung.":
    "Sensitivity expands the visible mask; it is removed only after explicit confirmation.",
  "Bündelt Profil, Ausgabegröße und die daraus berechneten Zielmaße.":
    "Groups profile, output size, and the resulting target dimensions.",
  "Die Rastergröße steuert die Analyse; die SVG-Skalierung steuert die endgültige Ausgabegröße.":
    "Raster size controls analysis; SVG scaling controls the final output size.",
  "Trennt beim Schwarzweiß-Filter dunkle und helle Rasterpixel.":
    "Separates dark and light raster pixels for the black-and-white filter.",
  "Höher ordnet mehr Pixel Schwarz zu; niedriger erhält nur die dunkelsten Bereiche.":
    "Higher values assign more pixels to black; lower values keep only the darkest areas.",
});

const englishPatterns: readonly Readonly<{
  expression: RegExp;
  replace: (...matches: string[]) => string;
}>[] = Object.freeze([
  pattern(/^Standard: (.*)$/, (value) => `Default: ${translateContent(value)}`),
  pattern(/^(\d+) Pixel ausgewählt$/, (count) => `${count} pixels selected`),
  pattern(
    /^(\d+) \/ (\d+) Farbflächen$/,
    (completed, total) => `${completed} / ${total} color areas`,
  ),
  pattern(/^Empfindlichkeit (\d+) %$/, (sensitivity) => `Sensitivity ${sensitivity}%`),
  pattern(/^(\d+) Tracing-Parameter$/, (count) => `${count} tracing parameters`),
  pattern(/^(\d+) Varianten?$/, (count) => `${count} ${count === "1" ? "variant" : "variants"}`),
  pattern(
    /^(\d+) (?:Entwurf|Entwürfe)$/,
    (count) => `${count} ${count === "1" ? "draft" : "drafts"}`,
  ),
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
  pattern(/^(\d+),(\d+) KiB$/, (integer, fraction) => `${integer}.${fraction} KiB`),
  pattern(/^(\d+) % geladen$/, (count) => `${count}% loaded`),
  pattern(/^(\d+) px Höhe(.*)$/, (height, suffix) => `${height} px height${suffix}`),
  pattern(/^A · Variante$/, () => "A · Variant"),
  pattern(/^B · Variante$/, () => "B · Variant"),
  pattern(/^([AB]) · Entwurf$/, (slot) => `${slot} · Draft`),
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
  pattern(/^Entwurf als ([AB]) setzen$/, (slot) => `Set draft as ${slot}`),
  pattern(/^Entwurf · (.*)$/, (suffix) => `Draft · ${translateContent(suffix)}`),
  pattern(/^Run (\d+) als ([AB]) setzen$/, (runId, slot) => `Set run ${runId} as ${slot}`),
  pattern(/^Run (\d+) ausgewählt$/, (runId) => `Run ${runId} selected`),
  pattern(/^Run (\d+) gelöscht$/, (runId) => `Run ${runId} deleted`),
  pattern(/^Run (\d+) löschen$/, (runId) => `Delete run ${runId}`),
  pattern(
    /^Variante (\d+) übernommen(.*)$/,
    (runId, suffix) => `Variant ${runId} accepted${suffix}`,
  ),
  pattern(/^Vorschau bereit(.*)$/, (suffix) => `Preview ready${suffix}`),
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
