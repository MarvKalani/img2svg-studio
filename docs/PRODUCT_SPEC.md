# Produktspezifikation

## 1. Produktumfang

img2svg Studio ist eine statisch auslieferbare Single-Page-Anwendung. Alle Bilddaten und
Konvertierungen verbleiben im Browser. Netzwerkzugriffe sind nur für ausdrücklich aktivierte,
zur Laufzeit geladene KI-Modelle sowie statische Anwendungsressourcen zulässig.

Die UI-Texte sind deutsch. Code-Bezeichner sind englisch.

## 2. Eingaben

### 2.1 Bildformate

Die Anwendung akzeptiert Formate, die der aktuelle Browser sicher dekodieren kann. Mindestens
PNG, JPEG und WebP werden unterstützt. Weitere erkannte Formate werden dynamisch in der UI
angezeigt; nicht unterstützte Formate erzeugen eine verständliche Fehlermeldung.

Die Browser-Schicht dekodiert Bilder über die Web-Plattform und übergibt RGBA-Bytes an WASM.
Die WASM-Engine enthält keine vollständigen Rasterbild-Decoder.

### 2.2 Größensteuerung

Vor der Konvertierung kann die Zielgröße gewählt werden:

- Unverändert.
- Prozentual: vordefinierte Werte und ein eigener positiver Prozentwert.
- Eigene Breite und Höhe in Pixeln; Seitenverhältnis standardmäßig gesperrt.
- Icon-Presets: 16, 32, 48, 64, 128, 256, 512 und 1024 px quadratisch.
- Bildschirm-Presets: HD 1280×720, FHD 1920×1080, QHD 2560×1440 und UHD 3840×2160.

Konventionelles Canvas-Resampling ist Bestandteil des MVP. KI-Upscaling ist ein späteres,
optionales Werkzeug und muss klar als solches gekennzeichnet sein.

## 3. Konvertierung

### 3.1 Robuster Kern

Jeder normale Run verwendet Clustering und Kontur-Tracing auf Basis von `visioncortex`.
Danach folgen der eigene PathOptimizer und die eigene SVG-Assembly. Der Output ist bei
identischer Eingabe und Konfiguration byte-identisch.

### 3.2 Optionale Formerkennung

Die Formerkennung ist eine zuschaltbare Schicht, kein erzwungener alternativer Pfad. Folgende
Typen können einzeln aktiviert werden:

- Kreis
- Ellipse
- Rechteck, einschließlich Rotation
- Linie
- Polygon

Für jeden Typ existieren passende Schwellenwerte. Nur ausreichend sicher erkannte Konturen
werden ersetzt. Der Nutzer kann die Behandlung nicht erkannter Inhalte wählen:

- `path`: als optimierte Pfade erhalten; Standard und empfohlen.
- `ignore`: bewusst aus der Ausgabe entfernen.
- `raster`: als klar gekennzeichnetes Hybrid-SVG einbetten.

Presets dürfen die Formerkennung vorkonfigurieren, die Einzeloptionen bleiben sichtbar und
änderbar.

### 3.3 Pfadoptimierung

Der eigene Optimizer muss mindestens:

- Offsets in Koordinaten einrechnen und unnötige `transform`-Attribute vermeiden.
- Absolute und relative Befehle gegeneinander abwägen.
- `H` und `V` verwenden, wenn die Darstellung kürzer ist.
- Präzision reduzieren und Zahlen kanonisch formatieren.
- Redundante Befehle und Attribute entfernen.
- Farben verlustfrei in kürzere Schreibweisen überführen.

Der Optimizer muss separat testbar und abschaltbar sein, damit seine Einsparung gemessen
werden kann.

### 3.4 Transparenz

Transparenz wird vor jeder RGB-Verarbeitung erkannt und erhalten. Voll transparente Bereiche
werden nicht gezeichnet; partielle Alpha-Werte werden deterministisch abgebildet. Die UI zeigt
ein Alpha-Badge, wenn der Input oder das Ergebnis Transparenz enthält.

### 3.5 Öffentliche Konvertierungsparameter

Die nachfolgende Tabelle ist die Ausgangsbasis. M1 muss bestätigen, wie jeder Wert auf die
tatsächlich gepinnte `visioncortex`-API abgebildet wird. Nicht unterstützte Parameter dürfen
nicht stillschweigend wirkungslos bleiben.

| Parameter | Bereich | Default | Bedeutung |
|---|---:|---:|---|
| `color_precision` | 1–8 Bit/Kanal | 7 | Farbzusammenfassung |
| `filter_speckle` | 0–1000 px | 4 | kleine Segmente entfernen |
| `gradient_step` | 0–128 | 16 | Differenz zwischen Hierarchieebenen |
| `hierarchical` | `stacked` / `cutout` | `stacked` | Überlappung oder Ausschnitt |
| `cluster_count` | 2–64 | 8 | optionale Ziel-Farbanzahl |
| `use_curves` | bool | `true` | Bezierkurven oder Polygonzüge |
| `corner_threshold` | 20–180° | 60° | zu erhaltende Ecke |
| `splice_threshold` | 20–90° | 45° | neue Kurve bei Winkelsumme |
| `segment_length` | 1–20 | 4,0 | maximale Segmentlänge |
| `simplify_epsilon` | 0,5–20 | 2,0 | Pfadvereinfachung |
| `precision` | 0–6 | 1 | Koordinaten-Dezimalstellen |
| `use_relative_coords` | bool | `true` | relative Pfadkommandos |
| `optimize` | bool | `true` | eigenen SVG-Optimizer verwenden |
| `shape_detection` | bool | `false` | native Formerkennung global |
| `detect_circles` | bool | presetabhängig | Kreise erkennen |
| `circle_threshold` | 0,0–1,0 | 0,85 | Mindest-Zirkularität |
| `detect_ellipses` | bool | presetabhängig | Ellipsen erkennen |
| `ellipse_threshold` | 0,0–1,0 | 0,80 | Mindest-Abdeckung |
| `detect_rectangles` | bool | presetabhängig | Rechtecke erkennen |
| `rect_angle_tolerance` | 0–45° | 15° | Abweichung vom rechten Winkel |
| `detect_lines` | bool | presetabhängig | Linien erkennen |
| `line_aspect_ratio` | 3–50 | 10 | Mindest-Seitenverhältnis |
| `detect_polygons` | bool | presetabhängig | Polygone erkennen |
| `polygon_epsilon` | 0,5–10 | 2,0 | Konturvereinfachung für Polygone |
| `min_contour_area` | 1–1000 px | 50 | kleinste erkennbare Kontur |
| `remainder_strategy` | `path` / `ignore` / `raster` | `path` | nicht erkannte Inhalte |

`use_gradients` bleibt ein experimenteller Kür-Parameter und gehört nicht zum MVP-Vertrag.

## 4. Vorverarbeitung und KI

Alle Änderungen sind nicht destruktiv; das Original bleibt verfügbar.

Pflichtwerkzeuge:

- Helligkeit, Kontrast, Blur und Schwarz-Weiß-Schwelle.
- Bilaterales Denoise.
- Konventionelles Upscale/Downscale.
- MODNet-Hintergrundentfernung.
- SAM-basierte Objektauswahl mit positiven und negativen Punkten.

KI-Modelle werden über eine zentrale Registry mit den Zuständen `unloaded`, `downloading`,
`initializing`, `ready` und `error` verwaltet. Die UI zeigt Modell, Größe, Lizenz, Backend und
echten Downloadfortschritt. Fehler müssen wiederholbar sein; Entladen muss Ressourcen und
Caches tatsächlich freigeben.

## 5. Presets und Parameter

Die ursprünglichen Presets Icon, Logo, Illustration, Photo und Pixel Art werden übernommen.
Jede manuelle Änderung versetzt die Auswahl in den Zustand „Benutzerdefiniert“. Eigene Presets
werden lokal gespeichert. Parameter werden zentral definiert, validiert und aus derselben
Definition für Engine, UI, History-Diff und WebMCP abgeleitet.

| Preset | Farbpräzision | Gradientenschritt | Speckle | Ecke | Splice | Segment | Kurven | Hierarchie |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Icon | 5 | 24 | 8 | 45° | 45° | 3 | an | stacked |
| Logo | 6 | 16 | 4 | 60° | 45° | 4 | an | stacked |
| Illustration | 7 | 16 | 4 | 60° | 45° | 4 | an | stacked |
| Photo | 8 | 48 | 10 | 180° | 45° | 4 | an | stacked |
| Pixel Art | 8 | 1 | 0 | 45° | 90° | 1 | aus | stacked |

Illustration ist das Default-Preset. Formerkennungsoptionen werden zusätzlich und unabhängig
von diesen Basiswerten gespeichert; empfohlene Startwerte sind: Icon aktiviert Kreise und
Rechtecke, Diagramm aktiviert Kreise, Rechtecke, Linien und Polygone, alle anderen Presets
starten mit ausgeschalteter Formerkennung.

## 6. History

Jeder Run erzeugt einen unveränderlichen Eintrag mit:

- SVG-String und Abmessungen.
- Eingabe-Referenz und optional gerendertem Thumbnail.
- vollständigem Einstellungs-Snapshot einschließlich Formerkennung und Zielgröße.
- Dateigröße, Dauer, Transparenz und Optimizer-Ersparnis.
- Anzahl Pfade und nativer Formen pro Typ.
- Zeitstempel und stabile Run-ID.

Die Session-History enthält standardmäßig maximal zehn Runs. Große Binärdaten werden nicht
ungeprüft in `localStorage` geschrieben. Jeder Eintrag kann angezeigt, exportiert, als A/B-Seite
gewählt und über „Einstellungen übernehmen“ wiederhergestellt werden.

## 7. A/B-Vergleich

- A und B können Original oder beliebige Runs sein.
- Ein Slider von 0 bis 100 Prozent beschneidet beide deckungsgleichen Darstellungen.
- Zoom und Pan wirken synchron.
- Eine zuschaltbare, gecachte Lupe zeigt Details auf beiden Seiten flüssig.
- Infokarten zeigen Name, Größe, wichtige Einstellungen und Statistiken.
- Eine dreispaltige Tabelle zeigt Parameter, A und B; Unterschiede sind hervorgehoben.
- „Nur Unterschiede“ blendet gleiche Werte aus.
- Jede Run-Seite bietet die passenden Download- und Kopieraktionen.

## 8. Ausgabe

SVG ist das Primärformat. Zusätzlich werden abhängig von den Browserfähigkeiten mindestens
WebP und PNG aus dem gerenderten Ergebnis angeboten. Weitere verlustbehaftete Formate dürfen
nur mit sichtbarer Qualitätssteuerung angeboten werden.

Downloads verwenden nachvollziehbare Dateinamen mit Run-ID oder Preset. Der Nutzer kann den
SVG-Code kopieren. Das Produkt darf ein Hybrid-SVG nicht als vollständig vektoriell ausgeben.

## 9. WebMCP

WebMCP ist eine progressive Erweiterung. Der aktuelle Entwurf verlangt einen sichtbaren
Browser-Kontext und kann sich ändern; deshalb liegt die Integration hinter einem kleinen
Adapter mit Feature Detection.

Vorgesehene imperative Werkzeuge:

- `get_capabilities`: Formate, Größen, Engine-Version und optionale Funktionen lesen.
- `get_state`: geladenes Bild, aktuelle Einstellungen, Modell- und Run-Zustand lesen.
- `configure_conversion`: validierte Einstellungen oder ein Preset anwenden.
- `convert_current_image`: einen Run starten und strukturierte Statistiken zurückgeben.
- `list_runs`: vorhandene Runs und ihre wichtigsten Kennzahlen lesen.
- `compare_runs`: A und B wählen und strukturierte Parameterunterschiede zurückgeben.
- `restore_run_settings`: Einstellungen eines Runs wiederherstellen.
- `export_run`: einen vorhandenen Run in einem unterstützten Format exportieren.

Das Laden einer lokalen Datei bleibt zunächst eine sichtbare Browser-/Dateiauswahl. Dadurch
werden große Binärdaten nicht in JSON-Werkzeugschemas gepresst. Ein Agent kann eine zuvor
erzeugte lokale Datei über die Browseroberfläche auswählen und danach den gesamten Workflow
über WebMCP ausführen.

Werkzeugausführungen und menschliche Bedienung verwenden dieselben Application Services und
aktualisieren denselben sichtbaren Zustand. Tool-Beschreibungen enthalten keine dynamischen
oder aus Bildinhalten übernommenen Anweisungen. Fehler und Resultate sind strukturiert und
eindeutig.

## 10. Qualitätsanforderungen

- Kein Anwendungs-Backend und keine Telemetrie.
- Keine ungeseedeten Zufallsquellen in der Konvertierung.
- UI bleibt während längerer WASM- und KI-Arbeit reaktionsfähig.
- Tastaturbedienung, sichtbare Fokuszustände und sinnvolle ARIA-Namen.
- Verständliche Fehler für beschädigte, zu große oder nicht unterstützte Bilder.
- Keine stillen Fallbacks, die Ausgabequalität, Datenschutz oder Lizenz ändern.
