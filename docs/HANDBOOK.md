# img2svg Studio — Handbuch

## Status

Dieses Handbuch wächst zusammen mit der Anwendung. Es beschreibt nur bereits entschiedene
oder implementierte Funktionen und kennzeichnet noch nicht verfügbare Abläufe ausdrücklich.

Aktueller Stand: Die responsive Studio-Oberfläche ist lokal ausführbar. Kopfzeile,
Parameterleiste, A/B-Arbeitsfläche, Parameterunterschiede, Verlauf und Statuszeile sind sichtbar.
PNG-, JPEG- und WebP-Bilder können lokal geladen, über den Rust-/WASM-Kern in SVG umgewandelt und
mit MODNet lokal freigestellt werden.

## Produktidee

img2svg Studio ist ein lokaler Bildkonverter im Browser. Ein Rasterbild wird mit verschiedenen
Einstellungen in SVG umgewandelt. Mehrere Ergebnisse bleiben im Verlauf erhalten und können
als A und B direkt miteinander verglichen werden.

Kein Bild wird an ein Anwendungs-Backend hochgeladen. Optionale KI-Modelle werden erst auf
Anforderung in den Browser geladen.

## Oberfläche

Der verbindliche erste UI-Entwurf liegt unter
[`docs/mockups/img2svg-ui-v1.png`](mockups/img2svg-ui-v1.png).

Der in Chrome abgenommene aktuelle Stand ist hier festgehalten:
[`docs/screenshots/app-shell.png`](screenshots/app-shell.png).

Die Oberfläche besteht aus:

- einer Kopfzeile mit Ansichten und Status.
- einer linken Seitenleiste für Bild, Größe, Parameter und KI-Werkzeuge.
- einer großen Arbeitsfläche für Original, SVG und A/B-Vergleich.
- einer Parameter-Diff-Tabelle unter dem Vergleich.
- einem Verlauf mit Conversion-Runs am unteren Rand.
- einer schmalen Statuszeile mit Größe, Pfaden, Formen und Laufzeit.

### Lokal öffnen

```bash
npm ci
npm run dev --workspace=img2svg-studio-web
```

Anschließend ist die Oberfläche unter `http://127.0.0.1:5173` erreichbar. Der aktuelle Stand
funktioniert auf breiten und schmalen Viewports ohne horizontales Seitenüberlaufen.

Vor einem Commit prüft `npm run check` im Repository-Root Formatierung, Lint, Zeilenlimit,
TypeScript, schnelle Web- und Rust-Tests, Produktionsbuild, Rust-Formatierung und Clippy.

### Engine und WASM neu bauen

Der generierte WASM-Baustein liegt versioniert unter `web/src/wasm-pkg`, sodass Start und
Web-Build nach `npm ci` ohne lokalen Rust-Build funktionieren. Änderungen unter `crates`
werden mit Rust 1.91 oder neuer, dem Ziel `wasm32-unknown-unknown` und `wasm-pack` 0.15.0 neu
gebaut:

```bash
rustup target add wasm32-unknown-unknown
npm run build:wasm
cargo test -p img2svg-core
```

Der abgenommene Build verwendet Rust 1.97.1. Auf diesem Apple-Silicon-Mac stellt die
Homebrew-Installation den Rustup-Compiler für den WASM-Build mit
`PATH="/opt/homebrew/opt/rustup/bin:$PATH" npm run build:wasm` bereit.

## Bild laden

„Bild wählen“ öffnet die lokale Dateiauswahl. Alternativ kann ein Bild auf die gestrichelte
Eingabefläche gezogen werden. Beide Wege verwenden dieselbe Decodergrenze.

„Beispiel laden“ öffnet ohne Dateidialog die mitgelieferte geometrische Mixed-Fixture. Sie läuft
über denselben Decoder und eignet sich für einen sofortigen Rundgang durch Konvertierung, History
und A/B-Vergleich. Der Abruf bleibt auf der App-Origin und enthält keine Nutzerdaten.

Unterstützt werden PNG, JPEG und WebP bis 25 MB. Nach erfolgreichem Laden zeigt die Oberfläche
Dateiname, Format, echte Pixelmaße, eine Miniatur und die große Vorschau. Die Vorschau verwendet
eine lokale `blob:`-URL; die Bilddaten werden nicht übertragen.

## Installieren, teilen und mit img2svg öffnen

Auf der ausgelieferten HTTPS-Demo kann Chrome das Studio über das Installationssymbol in der
Adressleiste als eigenständige App installieren. Die Installation ist optional; im normalen Tab
bleiben alle Funktionen einschließlich WebMCP verfügbar.

Nach der Installation kann ein unterstütztes PNG-, JPEG- oder WebP-Bild über den
Systembefehl „Teilen mit …“ an **img2svg** übergeben werden. Desktop Chrome kann dieselben
Dateitypen zusätzlich über „Öffnen mit img2svg“ starten. Welche Einträge das Betriebssystem
anzeigt, hängt von dessen PWA-Unterstützung ab. Beide Wege verwenden den normalen Bild-Loader mit
denselben Format-, Größen- und Fehlergrenzen wie „Bild wählen“.

Bei „Teilen mit …“ legt der Service Worker das Bild unter einem zufälligen Token kurz in einem
eigenen Cache ab, navigiert das Studio zu diesem Token und löscht den Cache-Eintrag beim ersten
Lesen. Er besitzt keinen App-Shell-, History-, SVG- oder Modellcache. Das Bild bleibt damit lokal
und wird nicht an einen Anwendungsserver gesendet.

Das Candy-App-Icon wurde bewusst mit dem Produkt selbst erstellt: Das Raster-Original liegt unter
[`docs/assets/app-icon-candy-source.png`](assets/app-icon-candy-source.png). Der img2svg-WASM-Kern
hat es nach lokaler Vorbereitung auf 512 × 512 Pixel mit 32 Farben und mittlerem Detail in
[`web/public/icons/app-icon.svg`](../web/public/icons/app-icon.svg) vektorisiert; daraus werden die
installierbaren 192- und 512-Pixel-Icons gerendert. Damit ist das Icon zugleich ein realer
Dogfooding-Nachweis für den Konvertierungspfad.

Beschädigte Dateien, andere Formate und Dateien über 25 MB zeigen einen verständlichen Fehler.
Eine bereits geladene gültige Vorschau bleibt dabei erhalten. Beim Laden eines neuen gültigen
Bildes wird die vorherige Objekt-URL freigegeben.

Die Kernbedienung ist mit der Tastatur möglich: `Tab` bewegt den sichtbaren Fokus, Leertaste
oder Eingabetaste löst die fokussierte Aktion aus, und Pfeiltasten ändern native Regler. Nach
einem Eingabefehler bleibt der zuletzt gültige Workspace bedienbar; eine gültige PNG-, JPEG-
oder WebP-Datei kann unmittelbar erneut gewählt werden.

## Konvertieren

Nach dem Laden aktiviert sich „Konvertieren“. Der Browser skaliert und filtert die Rasterpixel
gemäß „Raster vor Tracing“ und übergibt erst dieses RGBA-Ergebnis an einen Web Worker. Dort
erzeugt der Rust-Core über die schmale WASM-Grenze ein SVG, während die Oberfläche bedienbar
bleibt. Das Ergebnis ersetzt die Rastervorschau in „A · Variante“; die Statuszeile bestätigt den
Abschluss.

Der Standardlauf verwendet die Originalmaße, den Farbmodus und deterministische
`visioncortex`-Standardeinstellungen. Gleiche vorbereitete RGBA-Pixel erzeugen byteidentisches
SVG. Die Ausgabe besitzt eine passende `viewBox`, und vollständig transparente Bildbereiche
erzeugen kein Hintergrundelement.

### SVG herunterladen

Nach einer erfolgreichen Konvertierung erscheint oben rechts in „A · Variante“ die Aktion
„SVG herunterladen“. Sie serialisiert genau das aktuell dargestellte SVG und speichert es mit
dem Namen des Rasterbildes und der Endung `.svg`, beispielsweise `circle.svg`.

Ein späterer Konvertierungsfehler zeigt seine verständliche Meldung direkt beim Eingabebild.
Das letzte erfolgreiche SVG und dessen Download bleiben verfügbar; „Konvertieren“ ist danach
erneut bedienbar.

## Grundablauf

1. Bild per Drag-and-drop oder Dateiauswahl laden.
2. Rastergröße und optionalen Filter vor dem Tracing wählen.
3. „Konvertieren“ ausführen und das echte SVG in „A · Variante“ prüfen.
4. Rastervorbereitung, SVG-Skalierung und Tracing-Parameter variieren.
5. Ergebnis als SVG herunterladen und weitere Runs erzeugen.
6. Das Original und einen Run oder zwei Runs im Verlauf als A und B auswählen.
7. Darstellung und Parameterunterschiede vergleichen.

Dieser Ablauf wird mit jedem vertikalen Slice ergänzt und erst dann als verfügbar bezeichnet,
wenn er im Browser getestet wurde.

## Verlauf und A/B-Vergleich

Das geladene Rasteroriginal steht als unveränderlicher erster Eintrag im Verlauf. Es kann angezeigt
und wie jeder Run als A oder B gewählt werden. Jede erfolgreiche Konvertierung erzeugt zusätzlich
genau einen unveränderlichen Run. Der Verlauf zeigt das Original sowie die zehn neuesten Runs von
neu nach alt als horizontal bedienbare Karten. Jede Run-Karte enthält:

- die fortlaufende Run-ID.
- eine echte SVG-Miniatur.
- Zielmaße, Pfadanzahl und gemessene Laufzeit.

Das Auswählen einer Karte zeigt ihr gespeichertes SVG wieder in „A · Variante“. Die aktuell
eingestellten Regler bleiben dabei unverändert. „Einstellungen übernehmen“ kopiert anschließend
dessen validierte Raster-, Tracing- und SVG-Parameter in die Eingabemaske und berechnet beide
Maßanzeigen neu. Das geladene Originalbild, der ausgewählte Run und sein angezeigtes SVG bleiben
dabei unverändert. Eine erneute Konvertierung erzeugt einen neuen Run; bei gleichem Bild und
gleichen Einstellungen ist dessen SVG byteidentisch zum Ausgangs-Run. Nach dem elften Lauf wird
nur der älteste Run aus der sichtbaren Session-History entfernt.

Unter jeder History-Karte setzen die tastaturbedienbaren Aktionen „A“ und „B“ das Original oder
den Run in den jeweiligen Vergleichsplatz. Dieselbe Quelle belegt nie beide Plätze. Sobald A und B
gesetzt sind, zeigt die gemeinsame Arbeitsfläche Rasteroriginal und SVG oder zwei SVGs
deckungsgleich. Die Labels nennen „Original“ oder die zugeordnete Run-ID.

Der Regler „Überblendung“ bestimmt den sichtbaren Anteil von B:

- 0 Prozent zeigt nur A.
- 50 Prozent zeigt beide Ebenen mit halber Deckkraft.
- 100 Prozent zeigt nur B.

Beide Ebenen verwenden eine gemeinsame normalisierte ViewBox und erhalten darin die native
ViewBox des Runs seitenverhältnistreu. Deshalb bleiben auch unterschiedlich skalierte Runs
zentriert und deckungsgleich, ohne Kreisformen zu verzerren. Die aktuellen Eingabeeinstellungen
werden durch A/B-Zuweisungen nicht verändert.

Die Zoomtasten verändern den gemeinsamen Ausschnitt von 25 bis 800 Prozent. Mausrad oder
Trackpad zoomen um die Zeigerposition; Drag verschiebt den Ausschnitt. Auf Touch-Geräten steuern
zwei Finger Zoom und Position als Pinch-Geste. Beide Ebenen erhalten immer exakt dieselbe
Transformation. Pfeiltasten verschieben den fokussierten Vergleich tastaturbedienbar, ein
Doppelklick setzt Zoom und Position auf 100 Prozent zurück.

Die Tabelle „Parameterunterschiede“ verwendet dasselbe kanonische Schema wie die Eingabewerte.
„Nur Unterschiede“ ist standardmäßig aktiv und zeigt ausschließlich Parameter mit verschiedenen
Werten in A und B. Ohne den Filter erscheinen Rastergröße, Rasterfilter, Schwellwert,
Farbpräzision, Speckle-Filter und SVG-Skalierung in stabiler Reihenfolge, gefolgt vom globalen
Formerkennungsschalter und den fünf Formtypen. Beim Vergleich mit dem Rasteroriginal zeigt die
Tabelle „Quelle“ und kennzeichnet dort nicht vorhandene Konvertierungsparameter mit „—“.

„SVG A“ und „SVG B“ laden jeweils den unveränderten SVG-Text des zugeordneten Runs herunter. Die
normalisierte Vergleichsdarstellung gelangt nicht in den Export. Dateinamen enthalten Platz und
Run-ID, beispielsweise `circle-a-run-1.svg`, damit beide Ergebnisse unterscheidbar bleiben.

## Parameter

### Raster vor Tracing

„Rastergröße“ verändert die Pixel, die VTracer tatsächlich erhält. Verfügbar sind Originalgröße,
25, 50, 75, 125, 150, 200 und 400 Prozent sowie feste Zielhöhen von 576, 720, 1080 und 2160 Pixeln.
Die Breite wird immer aus dem Seitenverhältnis berechnet. So wird 1920×1080 bei 2160 Pixeln Höhe
zu 3840×2160, während Hoch- und Sonderformate weder beschnitten noch verzerrt werden.

„Farbe“ übernimmt RGB unverändert. „Graustufen“ berechnet eine feste Luminanz pro Pixel.
„Schwarzweiß“ wendet anschließend den einstellbaren Schwellwert von 0 bis 255 an. Der Alphakanal
bleibt in allen Modi erhalten. Die Anzeige „Vorbereitete Rastermaße“ nennt die Pixelgröße vor
VTracer; „Zielmaße“ berücksichtigt danach zusätzlich die SVG-Skalierung.

Rastergröße, Filter und Schwellwert werden unveränderlich im Run gespeichert, über
„Einstellungen übernehmen“ wiederhergestellt und im A/B-Parametervergleich angezeigt.

### Tracing und SVG-Ausgabe

Die numerischen Parameter wirken von der Seitenleiste über den Worker und WASM bis in den
Rust-Core:

| Parameter | Gültiger Bereich | Standard | Wirkung |
|---|---:|---:|---|
| Farbpräzision | 1–8 Bit | 7 Bit | bestimmt, wie nah beieinanderliegende Farben gruppiert werden |
| Speckle-Filter | 0–1000 px | 4 px | entfernt kleine Farbcluster |
| SVG-Skalierung | 10–400 % | 100 % | skaliert SVG und ViewBox nach dem Tracing proportional |

Die Oberfläche bietet für die Zielgröße 25, 50, 75, 100, 150, 200 und 400 Prozent direkt an.
Nach dem Laden eines Bildes zeigt sie die daraus entstehenden Zielmaße sofort an. Ein Lauf mit
50 Prozent aus einem 256×256-Bild erzeugt beispielsweise ein SVG mit 128×128-ViewBox.

Ungültige Werte werden als typisierter Einstellungsfehler abgelehnt. Weitere Parameter werden
erst ergänzt, wenn derselbe vollständige Weg bis in die Engine getestet ist.

## Native Formen

„Native Formen“ ist standardmäßig ausgeschaltet. Kreis, Rechteck, Ellipse, Linie und Polygon sind
vorgewählt, aber bis zum Aktivieren des globalen Schalters nicht bedienbar. Danach lassen sich die
Typen einzeln ein- und ausschalten. Globaler Zustand und Typauswahl werden mit jedem Run
unveränderlich gespeichert, wiederhergestellt und im A/B-Parametervergleich angezeigt.

Bei ausgeschalteter Formerkennung ist die Ausgabe byteidentisch zur bisherigen Konvertierung.
Bei eingeschalteter Erkennung fällt jeder nicht eindeutig erkannte oder noch nicht implementierte
Typ auf den bewährten SVG-Pfad zurück.

### Native Kreise

Ist „Kreis“ als einziger Typ aktiv, erkennt die Engine kompakte, nahezu quadratische
Kreisflächen und gibt sie als `<circle>` mit Mittelpunkt, Radius, dominanter Originalfarbe und
gegebenenfalls Deckkraft aus. Der Fixture-Kreis wird als `cx="128"`, `cy="128"`, `r="64"` und
`fill="#0EA5E9"` ausgegeben. Status und History zeigen dafür „1 Kreis“ und keinen Pfad.

Die Ground-Truth-Abnahme erlaubt höchstens 2 Pixel Abweichung je Geometriewert. Intern sind
Seitenverhältnis und Flächenfüllung bewusst enger begrenzt. Eine zusätzliche Pixelbelegungsprüfung
aus Visioncortex weist etwa einen hohlen Ring trotz kreisähnlicher Fläche zurück; passt eine
Kontur nicht eindeutig, bleibt sie ein Pfad.

### Native Rechtecke

Ist „Rechteck“ aktiv, gibt die Engine kompakte, vollständig gefüllte rechteckige Cluster als
`<rect>` mit Position, Breite, Höhe, dominanter Originalfarbe und gegebenenfalls Deckkraft aus.
Das Fixture wird als `x="64"`, `y="80"`, `width="128"`, `height="96"` und `fill="#22C55E"`
ausgegeben; Status und History zeigen „1 Rechteck“ und keinen Pfad.

Die Flächenabweichung darf intern höchstens zwei Prozent betragen. Sehr schmale gefüllte Cluster
bleiben für die spätere Linienerkennung erhalten; nicht rechteckige Konturen wie das
Dreieck-Fixture fallen sicher auf einen Pfad zurück.

### Native Ellipsen

Sind „Kreis“ und „Ellipse“ aktiv, entscheidet zuerst die Ausdehnung: Nahezu gleiche Breite und
Höhe bleiben `<circle>`, eine klar unterschiedliche Ausdehnung mit elliptischer Flächenfüllung
wird `<ellipse>`. Das Ellipsen-Fixture erzeugt `cx="128"`, `cy="128"`, `rx="80"`, `ry="48"`
und `fill="#8B5CF6"`; Status und History zeigen „1 Ellipse“ und keinen Pfad.

Ellipse und Kreis verwenden dieselbe konservative Flächentoleranz. Die maximal drei Prozent
Seitenverhältnisabweichung des Kreises sind zugleich die eindeutige Typgrenze: Eine Ellipse muss
außerhalb dieser Grenze liegen. Zusätzlich darf ihre Pixelbelegung höchstens acht Prozent von
der idealen Ellipsenfläche abweichen; dadurch bleibt eine unregelmäßige Kontur trotz ähnlicher
Gesamtfläche ein Pfad.

### Native Linien

Ist „Linie“ aktiv, erkennt die Engine stark längliche, vollständig gefüllte horizontale und
vertikale Cluster. Das Fixture wird als `<line>` von `x1="48"`, `y1="128"` nach `x2="208"`,
`y2="128"` mit `stroke-width="12"` und `stroke="#F97316"` ausgegeben. Status und History zeigen
„1 Linie“ und keinen Pfad.

Die längere Seite muss mindestens viermal so groß wie die kürzere sein; die Fläche darf höchstens
zwei Prozent vom Begrenzungsrahmen abweichen. Dadurch bleiben kompakte Formen Pfade und normale
Rechtecke Rechtecke.

### Native Polygone

Ist „Polygon“ aktiv, erkennt die Engine aktuell gefüllte aufrechte Dreiecke mit drei geraden
Kanten. Das Fixture erzeugt `<polygon points="127.5,48 216,207 40,207">` und
`fill="#EC4899"`. Alle Punkte liegen innerhalb der 2-Pixel-Manifesttoleranz; Status und History
zeigen „1 Polygon“ und keinen Pfad.

Ein typisiertes Vereinfachungs-Epsilon erlaubt pro linker und rechter Kante höchstens 2 Pixel
Abweichung von der idealen Geraden. Zusätzlich darf die Clusterfläche höchstens acht Prozent von
der Dreiecksfläche abweichen. Eine gekrümmte oder komplexe Kontur bleibt dadurch ein Pfad.

### Gemischte Szenen

Sind alle Formtypen aktiv, gibt die Engine native Elemente in der kanonischen Reihenfolge Kreis,
Rechteck, Ellipse, Linie und Polygon aus. Jedes Cluster erzeugt genau ein Element. Das
Mixed-Fixture enthält Kreis, Rechteck, Linie und Dreieck und erscheint deshalb als `<circle>`,
`<rect>`, `<line>` und `<polygon>` ohne zusätzlichen Pfad. Status und History zählen jede Form
genau einmal. Eine wiederholte Konvertierung erzeugt dasselbe SVG byteidentisch.

## KI-Manager

Der KI-Manager ist in der Seitenleiste standardmäßig geöffnet und kann über seine Kopfzeile ein-
und ausgeklappt werden. KI-Modelle starten im Zustand „Nicht geladen“. Jede Modellkarte zeigt:

- Name, Aufgabe, Größe und Lizenz.
- Zustand: nicht geladen, Download mit Prozentwert, Initialisierung, bereit oder Fehler.
- das nach der Initialisierung verwendete Backend, beispielsweise WebGPU oder WASM.
- Aktionen zum Laden, Wiederholen und Entladen.

Die validierte Registry legt MODNet Portrait Matting mit 24,69 MiB für Hintergrundentfernung und
SlimSAM 77 Uniform mit 19,76 MiB für Smart Select fest. Beide Modelle und ihre Ursprungsprojekte
stehen unter Apache-2.0. MODNet ist für WebGPU mit WASM-Fallback vorgesehen; SlimSAM verwendet
zwei FP16-Graphen über WebGPU. Revision, Einzeldateien und Prüfsummen sind im
Drittanbieter-Inventar festgehalten.

### Hintergrund entfernen

Nach dem Laden eines Bildes startet „Hintergrund entfernen“ den revisionsgebundenen MODNet-Ablauf.
Beim ersten Aufruf lädt der Browser 25.889.088 Byte (24,69 MiB); die Modellkarte zeigt den echten
Bytefortschritt. Anschließend erscheint das tatsächlich verwendete Backend als WebGPU oder WASM.

Vorverarbeitung, Inferenz, Alpha-Maske und PNG-Erzeugung laufen lokal. Das Ergebnis wird als
`<ausgangsname>-freigestellt.png` in den Workspace übernommen. MODNet bleibt für weitere Aufrufe
im KI-Manager bereit und kann dort entladen werden. Ein Ladefehler bietet über denselben Manager
einen erneuten Versuch.

### Smart Select

Smart Select wird verfügbar, sobald ein Bild geladen und SlimSAM 77 Uniform im KI-Manager
explizit auf „Bereit · WebGPU“ gebracht wurde. „Smart Select“ berechnet einmalig das lokale
Bild-Embedding und legt eine deckungsgleiche, türkisfarbene Maskenebene über das Rasterbild.

„+ Vordergrund“ setzt grüne Punkte auf Bereiche, die zur Auswahl gehören. „− Hintergrund“ setzt
rote Korrekturpunkte auf Bereiche, die ausgeschlossen werden sollen. Jeder neue Punkt bleibt
sichtbar, ergänzt alle vorherigen Punkte und aktualisiert die Maske. Der getestete Kernablauf
verwendet zwei Vordergrundpunkte und einen Hintergrundpunkt.

„Maske invertieren“ wechselt zwischen ausgewähltem und nicht ausgewähltem Bereich. „Anwenden“
multipliziert die Maske mit dem vorhandenen Alpha-Kanal und lädt
`<ausgangsname>-smart-select.png` in den Workspace. RGB-Werte bleiben unverändert. „Verwerfen“
beendet die Auswahl und lässt Eingabebild sowie Conversion-History unverändert. Bild, Punkte,
Embedding, Decoder und PNG-Erzeugung bleiben im Browser; Netzwerkzugriffe dienen ausschließlich
dem bewusst gestarteten, revisionsgebundenen Modelldownload.

### KI-Ergebnis konvertieren und Original wiederherstellen

„Anwenden“ übernimmt ein MODNet- oder Smart-Select-Ergebnis als „KI-Ergebnis · V…“. Das
Original bleibt im Arbeitsspeicher und ist über „Original wiederherstellen“ erreichbar. Jede
Konvertierung speichert genau die dabei aktive Eingabeversion im Run. History-Karten zeigen sie
an; im A/B-Vergleich erscheint „Eingabe“ als Parameterunterschied zwischen Original und
KI-Ergebnis.

Run-Auswahl und A/B-Downloads verwenden weiterhin den zum Run gehörenden Namen und SVG-Stand.
Das Wiederherstellen des Originals beendet eine aktive Vergleichsansicht, zeigt das Raster wieder
an und verändert vorhandene Runs nicht. Eine weitere Konvertierung des Originals erzeugt einen
neuen Run mit derselben Originalversion.

Gleichzeitige Lade- oder Entladebefehle für dasselbe Modell teilen sich eine Operation. Dadurch
wird ein Modell einmal initialisiert und sein `dispose()` beim Entladen einmal ausgeführt.

### Abbrechen, erneut versuchen und entladen

Während Download und Initialisierung bietet die Modellkarte „Abbrechen“. Die Aktion beendet den
aktiven Abruf und führt das Modell in „Nicht geladen“ zurück; „Laden“ startet danach einen neuen
Versuch. Netzwerkfehler erscheinen mit einer verständlichen Meldung und „Erneut versuchen“.

Jedes Modellartefakt wird vor der Initialisierung gegen Bytezahl und SHA-256 aus dem Manifest
geprüft. Ein beschädigter Cache-Eintrag wird gezielt ersetzt. Der verifizierte Downloadcache
bleibt für spätere Sitzungen erhalten, während „Entladen“ auf eine laufende Inferenz wartet und
anschließend Tensoren, Session und flüchtige Modellressourcen freigibt. Die Karte zeigt während
dieser Barriere „Wird entladen …“ und endet erst danach in „Nicht geladen“.

Bei einem Verbindungsfehler:

1. Netzwerkverbindung wiederherstellen.
2. In der betroffenen Modellkarte „Erneut versuchen“ ausführen.
3. Nach „Bereit · WebGPU“ oder „Bereit · WASM“ die KI-Aktion erneut starten.

## WebMCP

In einem unterstützten Browser kann ein Agent dieselben sichtbaren Anwendungsdienste verwenden
wie ein Mensch. Auf `https://studio.img2.download` bestätigt der Nutzer die lokale Dateiübergabe.
Danach kann der Agent Einstellungen und Workspace lesen, konvertieren, History und A/B bedienen,
SVG exportieren sowie KI-Modelle und KI-Aktionen steuern. Jede Aktion bleibt unmittelbar in der
Oberfläche sichtbar.

Chrome 149 oder neuer benötigt für lokale Tests `#enable-webmcp-testing`; für die Toolansicht in
DevTools zusätzlich `#devtools-webmcp-support`. Nach dem Neustart zeigt DevTools unter
„Application · WebMCP“ die registrierten Werkzeuge und ihre Aufrufe. Chrome 150 verwendet
`document.modelContext`; die ältere Navigator-Variante gehört nicht zum Studio.

Nach bestätigter Bildauswahl kann ein Agent diesen Ablauf verwenden:

1. `get_capabilities` und `get_workspace_state` lesen.
2. Mit `configure_conversion` Rastergröße, Filter, Schwellwert, Tracing-Werte und SVG-Skalierung
   setzen und mit `convert_current_image` konvertieren. Die Rastergröße verwendet genau eines aus
   `useOriginalRasterSize`, `rasterResizePercent` oder `rasterTargetHeightPixels`.
3. Runs über `select_history_run` anzeigen. `select_comparison_a` und `select_comparison_b` wählen
   per Run-ID oder `original: true` die sichtbaren Vergleichsquellen;
   `download_selected_svg` exportiert den sichtbaren Run.
4. Modelle mit `load_model`, `retry_model` und `unload_model` verwalten.
5. `apply_background_removal` oder `apply_smart_selection` anwenden. Smart-Select-Punkte verwenden
   bildunabhängige X-/Y-Werte von 0 bis 1 und mindestens zwei Vordergrund- sowie einen
   Hintergrundpunkt.

Zustandsändernde Toolergebnisse enthalten `ok` sowie bei Fehlern einen stabilen Code und eine
verständliche Meldung. Dateinamen aus lokalen Eingaben sind als nicht vertrauenswürdiger Inhalt
markiert.

Der bestehende Vorgänger auf `https://img2.download` erhält einen getrennten WebMCP-Adapter für
seinen eigenen sichtbaren Converter-Ablauf. Der vorbereitete Adapter steuert Queue-Zustand,
globale Einstellungen, Größenberechnung, Batch- und Einzeldownload, Preview-Navigation,
Transformation, SVG-Parameter und Budgetmodus. Die lokale Dateiauswahl bleibt eine bewusst vom
Nutzer bestätigte Browseraktion.

Sein Quellrepository erzeugt mit `npm ci && npm run build` einen geprüften statischen `dist`-Ordner.
Dieser enthält die App, VTracer, Service Worker, rechtliche Seiten und WebMCP-Header, aber keine
Tests oder Paketmetadaten.

WebMCP ist eine progressive Erweiterung. Ohne WebMCP bleibt die gesamte UI bedienbar.

## ChatGPT-MCP-Companion

Der Companion unter `mcp/` ist ein eigener stateless Server für ChatGPT und andere MCP-Hosts. Er
teilt den Rust/WASM-Konvertierungskern mit dem Studio, aber nicht dessen flüchtigen Browserzustand.
`vectorize_image` akzeptiert genau eine ChatGPT-Dateireferenz oder einen Base64-Testwert sowie:

- `mode`: `shapes` für evidenzbasierte native Elemente oder `trace` für Pfade.
- `color_count`: gewünschte Palette von 2 bis 256 Farben.
- `detail_level`: `low`, `medium` oder `high`.

Die Toolbeschreibung empfiehlt für flache Logos `shapes`, vier Farben und niedrige Details. Eine
Bitte wie „mach es einfacher“ reduziert Farbanzahl und Detailstufe. Das Ergebnis enthält den
SVG-String, effektive Parameter, Eingabe- und Ausgabemaße, Bytezahl sowie Zählungen für Pfade und
alle fünf nativen Formtypen.

Lokaler Start:

```bash
npm run build --workspace=img2svg-studio-mcp
npm start --workspace=img2svg-studio-mcp
```

`GET /` liefert den Healthcheck, `/mcp` verwendet Streamable HTTP. Der Server akzeptiert höchstens
25 MiB kodierte Bilddaten und 16.777.216 dekodierte Pixel. Dateidownloads sind auf HTTPS, 15
Sekunden und denselben Byteumfang begrenzt. Bild und SVG existieren nur während des einzelnen
Toolaufrufs; es gibt keine MCP-Anwendungssitzung oder Persistenz.

`get_svg_preview` übernimmt den SVG-String unverändert, rendert ihn als isolierte Bildquelle und
zeigt Byte-, Element- und Pfadzahl. „Download SVG“ erzeugt einen Blob direkt aus demselben String;
dadurch entsprechen Download und Vorschau bytegenau einander. Das Renderwerkzeug enthält keine
Konvertierungslogik und akzeptiert höchstens 5 MiB SVG.

Die echte ChatGPT-Abnahme verbindet den lokalen Endpunkt bevorzugt über OpenAI Secure MCP Tunnel.
Dafür bleiben Server und Bilder auf dem Entwicklungsrechner; nur ausgehender HTTPS-Verkehr zum
OpenAI-Tunnel ist nötig. Ein temporärer öffentlicher HTTPS-Tunnel ist eine Alternative. Dauerhaftes
öffentliches MCP-Hosting wird erst für eine unabhängig vom Entwicklungsrechner verfügbare
ChatGPT-App erwogen. Der offizielle lokale Inspector prüft bereits beide Werkzeuge, die
MCP-Apps-Ressource und den vollständigen Fixture-zu-Preview-Datenfluss.

## Formerkennungs-Fixtures

Die Ground-Truth-Bilder unter `fixtures/shape-recognition` prüfen Kreis, Ellipse, Rechteck,
Linie, Polygon und eine gemischte Szene. Der Basistest beweist byteidentisches Abschalten und
sicheren Pfad-Fallback. Die Einzelabnahmen aller fünf Formtypen und die Mixed-Abnahme lesen das
gemeinsame Manifest. Sie prüfen Elementtyp, Farbe, Statistik, Reihenfolge und jeden Geometriewert
innerhalb der dort definierten 2-Pixel-Toleranz.

## Datenschutz

- Bildverarbeitung im sichtbaren Studio bleibt lokal im Browser.
- Der optionale ChatGPT-Companion verarbeitet die ausdrücklich übergebene Datei einmalig im
  Arbeitsspeicher und speichert weder Bild noch SVG.
- Die App verwendet lokale Fonts und verzichtet auf Telemetrie und Tracker.
- KI-Modellzugriffe beginnen nach sichtbarer Nutzeraktion.
- Der automatisierte Netzwerkaudit erlaubt bei lokaler Conversion keine Cross-Origin-Anfrage;
  nach einer expliziten Modellaktion sind ausschließlich revisionsgebundene Modellartefakte
  und deren Weiterleitungen zulässig.

## Dokumentationspflege

Jeder repo-wirksame Slice prüft dieses Handbuch:

- Nutzerablauf geändert: Handbuch im selben Commit aktualisieren.
- öffentlicher Vertrag geändert: technische Spezifikation im selben Commit aktualisieren.
- Produkt- oder Architekturentscheidung geändert: Entscheidungsprotokoll im selben Commit
  aktualisieren.
- kein Dokumentationsbedarf: im Review bewusst bestätigen, statt ihn still zu übergehen.

`TASKS.md` enthält nur offene Arbeit. Vor der Implementierung wird das dortige
Given–When–Then-Szenario als ausführbarer Test angelegt. Nach bestandener Orchestrator-Abnahme
wird der Task im selben Commit aus der Liste entfernt; Commit-Beschreibung, Test und Handbuch
bleiben als dauerhafter Nachweis erhalten.

Screenshots und Beispiele werden aktualisiert, sobald der jeweilige Ablauf tatsächlich
funktioniert. Veraltete Anleitungen bleiben nicht als historische Beschreibung im Handbuch.

Jede Funktion wird vor ihrer Aufnahme in dieses Handbuch direkt im echten Google Chrome
abgenommen. Automatisierte Tests allein reichen nicht. Ein dabei erkannter Mangel hält den Task
offen, erhält einen Regressionstest und wird erneut geprüft; erst danach werden Task und
Handbuch abgeschlossen.
