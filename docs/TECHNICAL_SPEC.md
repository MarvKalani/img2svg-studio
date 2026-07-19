# Technische Spezifikation

## 1. Architektur

Das Repository wird als Rust-Workspace mit separater Web-Anwendung aufgebaut:

- `img2svg-core`: deterministische, plattformunabhängige Engine ohne Browserabhängigkeit.
- `img2svg-wasm`: schmale `wasm-bindgen`-Schnittstelle und serialisierbare Resultate.
- `web`: Vite + TypeScript 7.0.2 ohne schweres UI-Framework; UI, Canvas, Worker, History,
  SVG-Export, Modellverwaltung und WebMCP.

Die Engine kennt keine DOM- oder Dateiauswahl. Die Web-App kennt keine Tracing-Details.

## 2. Datenfluss

```text
Datei / Drop
  → Browser-Decoder
  → unveränderliches Original-RGBA
  → Transformation und Zielgröße
  → optional angewendete KI-Maske
  → RGBA + validierte ConversionOptions an WASM-Worker
  → Clustering und Tracing
  → optionale Erkennung ausgewählter Formen
  → deterministische SVG-Assembly
  → ConversionResult { svg, stats, warnings }
  → History / Anzeige / Export / A-B
```

CPU-intensive WASM-Aufrufe laufen in einem Web Worker, damit die Bedienoberfläche während der
Konvertierung reaktionsfähig bleibt.

## 3. Zentrale Domänenmodelle

Der implementierte `ConversionOptions`-Kern enthält Farbpräzision 1–8 Bit, Speckle-Filter
0–1000 und proportionale Zielgröße 10–400 Prozent. Die kanonischen Defaults sind 7, 4 und 100.
Rust kapselt valide Werte in `ConversionOptions::try_new`; TypeScript erzeugt sie ausschließlich
über `createConversionOptions`. Grenztests halten beide Seiten synchron.

`ShapeDetectionOptions` ergänzt einen globalen Schalter und die typisierten Formtypen Kreis,
Rechteck, Ellipse, Linie und Polygon. Standardmäßig ist die Kette ausgeschaltet, während alle
Typen vorgewählt sind. TypeScript erzeugt die Typauswahl aus `nativeShapeSchema`; Rust prüft die
aktivierten Typen in derselben stabilen Reihenfolge. Alle fünf Einzeldetektoren sind implementiert;
nicht eindeutig erkannte Konturen bleiben Pfade.

Eine kanonische Schemaquelle erzeugt oder speist:

- Rust-Validierung.
- TypeScript-Typen und Standardwerte.
- UI-Metadaten.
- History-Diff.
- WebMCP-Inputschema.

Der Rust-`ConversionResult` enthält den SVG-String und typisierte Shape-Zählungen. Die Web-App
ergänzt aus validiertem SVG, Eingabe und Laufzeitmessung die Zielmaße sowie Pfad- und alle fünf
Shape-Anzahlen und den unveränderlichen Options-Snapshot des History-Runs.

Der aktuelle `historyStore` speichert pro erfolgreichem Lauf SVG, kopierten Options-Snapshot,
Dateiname, Zielmaße, Pfad- und alle fünf Shape-Anzahlen sowie Laufzeit. Run, Options-Snapshot und
zurückgegebene Listenkopie werden eingefroren. IDs sind innerhalb der Sitzung monoton steigend.
Der Store hält höchstens zehn Einträge in Reihenfolge neu nach alt und verwaltet die ausgewählte
Run-ID getrennt vom aktuellen Eingabeformular.

## 4. Engine-Module

Der Core trennt Pipeline und Formerkennung, damit beide Quellen unter 1000 Zeilen bleiben:

```text
lib.rs               Konfiguration, Pipeline, Fehler und Pfad-Fallback
shape_detection.rs   Typen, Detektorreihenfolge, native SVG-Elemente und Statistik
```

`visioncortex` wird als Abhängigkeit verwendet, nicht kopiert. Herkunft, Version und Lizenz
werden dokumentiert. Übernommene oder adaptierte Algorithmen erhalten konkrete Hinweise.

Der kompatible Basiskontrakt lautet
`convert_rgba(rgba, width, height) -> Result<String, ConversionError>`. Die erweiterte
Engine-Grenze `convert_rgba_with_options_result` liefert `ConversionResult` mit SVG und
typisierten Shape-Zählungen. Sie validiert positive
Maße und die exakte RGBA-Länge, verwendet für vollständig transparente Pixel einen
deterministisch gewählten unbenutzten RGB-Schlüssel und assembliert SVG- und Pfadattribute in
stabiler Reihenfolge. `ConversionError::code()` liefert einen öffentlichen
`ConversionErrorCode` für ungültige Maße, abweichende Pixellänge oder einen nicht verfügbaren
Transparenzschlüssel. Die WASM-Grenze akzeptiert `Uint8Array`, zwei `u32`-Maße, die drei
numerischen Optionswerte und ein `u32`-Bitfeld für globalen Formerkennungszustand und Typauswahl.
Sie liefert den SVG-String oder einen der stabilen numerischen Fehlercodes 1–4.
Die schmale WASM-Grenze liefert weiterhin nur den SVG-String; die Web-App liest sichtbare
Elementzählungen aus genau diesem validierten SVG und speichert sie mit dem Run.

Der Kreisdetektor wertet pro Cluster dessen Begrenzungsrahmen und Pixelanzahl aus. Maximal drei
Prozent Seitenverhältnisabweichung und acht Prozent Abweichung von der erwarteten Kreisfläche
begrenzen False Positives. Die Geometrie folgt deterministisch aus dem Begrenzungsrahmen; eine
`BTreeMap` bestimmt die dominante Original-RGBA-Farbe unabhängig von Hash-Reihenfolgen. Eine
nicht erfüllte Bedingung führt ohne Teilresultat zum vorhandenen Pfad zurück. Der Test liest PNG
und Sollwerte direkt aus dem gemeinsamen Fixture-Manifest und erlaubt die dort festgelegten zwei
Pixel Geometrietoleranz.

Der Rechteckdetektor fordert höchstens zwei Prozent Abweichung zwischen Cluster- und
Begrenzungsrahmenfläche. Ein Verhältnis der kürzeren zur längeren Seite unter 0,1 wird bewusst
abgelehnt, damit linienartige Cluster dem späteren Liniendetektor vorbehalten bleiben. Position
und Maße folgen direkt aus dem Begrenzungsrahmen; Farbe, Deckkraft, Skalierung und Zahlenformat
verwenden dieselben deterministischen Hilfen wie der Kreis.

Der Ellipsendetektor verwendet dieselbe maximale Flächenabweichung von acht Prozent wie der
Kreisdetektor. Er akzeptiert ausschließlich Seitenverhältnisse außerhalb der
Drei-Prozent-Kreisgrenze. Bei gemeinsam aktivierten Detektoren bleibt die stabile Reihenfolge
Kreis vor Ellipse; damit besitzt die Typgrenze genau eine Ausgabe. Eine zusätzliche
Belegungsprüfung vergleicht jedes Clusterpixel deterministisch mit der idealen Ellipse im
Begrenzungsrahmen und erlaubt höchstens acht Prozent Abweichung. So reichen ähnliche Gesamtfläche
und Ausdehnung einer Freiformkontur nicht für eine native Klassifizierung.

Der Liniendetektor übernimmt horizontale oder vertikale Cluster ab einem Verhältnis von 4:1 und
höchstens zwei Prozent Abweichung von der vollständig gefüllten Begrenzungsrahmenfläche. Die
kürzere Seite wird zur Strichbreite, die Mittellinie der längeren Achse zu den Endpunkten. Sehr
schmale Cluster sind zuvor ausdrücklich vom Rechteckdetektor ausgeschlossen. Transparenz wird als
`stroke-opacity` ausgegeben; Skalierung und Zahlenformat bleiben mit den gefüllten Formen
identisch.

Der Polygon-Detektor leitet für das aktuelle Dreiecksprofil aus jeder belegten Bildzeile die
linke und rechte Kante ab. `PolygonSimplificationEpsilon` kapselt die zulässige Abweichung von
2 Pixeln zur jeweiligen idealen Geraden. Die Clusterfläche darf höchstens acht Prozent von der
abgeleiteten Dreiecksfläche abweichen. Gekrümmte oder komplexe Konturen überschreiten mindestens
eine dieser Grenzen und bleiben Pfade. Die ausgegebene Punktreihenfolge ist Spitze, rechts unten,
links unten. Kantenabweichungen werden an Pixelzentren gemessen, damit dasselbe Epsilon an beiden
Rastergrenzen symmetrisch gilt.

Die SVG-Assembly sortiert erkannte native Elemente kanonisch als Kreis, Rechteck, Ellipse, Linie
und Polygon. Mehrere Elemente desselben Typs behalten ihre stabile Clusterreihenfolge;
Pfad-Fallbacks folgen ebenfalls stabil. Da `detect_native_shape` pro Cluster beim ersten
passenden Detektor endet, kann kein Cluster doppelt ausgegeben oder gezählt werden. Der
Mixed-Fixture-Test prüft Geometrie, Farbe, Statistik, Reihenfolge und zwei byteidentische Läufe.

`visioncortex` 0.8.10 und `wasm-bindgen` 0.2.126 sind exakt gepinnt; beide stehen unter
MIT oder Apache-2.0. Die Lizenz des eigenen Projekts wird davon getrennt in D-009 entschieden.
Die Test-only-Abhängigkeiten `png` 0.18.1, `serde` 1.0.229 und `serde_json` 1.0.150 sind ebenfalls
exakt gepinnt und gelangen nicht in das produktive WASM.

## 5. Determinismus

- Stabile Reihenfolge für Cluster, Konturen, Attribute und Statistiken.
- Keine iteration-order-abhängigen Hashmaps in serialisierter Ausgabe.
- Kanonische Zahlen- und Farbformatierung.
- Feste Rundungsregeln, keine locale-abhängige Ausgabe.
- Fixtures testen zwei identische Runs auf String-Gleichheit.
- Build-Metadaten dürfen nicht ungefragt in den SVG-String gelangen.

## 6. Web-Anwendung

Der erste ausführbare Slice verwendet Vite 8.1.5, TypeScript 7.0.2 und frameworkfreies
semantisches HTML/CSS. `web/index.html` enthält die sichtbaren Landmarks und
`web/src/styles.css` die responsive Darstellung.

`web/src/image/decode-image.ts` validiert PNG, JPEG und WebP bis 25 MB und dekodiert über
`createImageBitmap`. Der Browser-Port erzeugt erst nach erfolgreicher Dekodierung eine lokale
Objekt-URL. `image-loader.ts` verbindet Dateiauswahl und Drop mit derselben Funktion, ersetzt
die sichtbare Vorschau atomar und gibt die vorherige Objekt-URL beim nächsten gültigen Bild
oder vor dem Verlassen über den kleinen `imageStore` frei.

`conversionService` liest RGBA über ein kurzlebiges Canvas und überträgt dessen Buffer ohne
Kopie an einen dedizierten Worker. Der Worker initialisiert das generierte WASM, ruft den
Rust-Core auf und wird nach genau einem Ergebnis beendet. Der Controller validiert das
zurückgegebene XML als SVG, bevor es die Rastervorschau ersetzt. Die TypeScript-Domäne ergänzt
die Enginecodes um `WorkerFailed` und `InvalidSvg`; `ConversionFailure` ordnet jedem Code genau
eine verständliche UI-Meldung zu.

Farbpräzision setzt den Bitverlust der `visioncortex`-Farbnähe. Der Speckle-Wert wird wie im
Tracing-Fundament zu einer Mindestfläche quadriert und vor der SVG-Assembly nochmals explizit
angewendet. Die Zielgröße skaliert den bereits vektorisierten Pfad deterministisch und berechnet
positive ganzzahlige Zielmaße mit derselben Rundungsregel in Rust und TypeScript.

Der SVG-Download serialisiert das aktuell gerenderte `svg`-Element mit `XMLSerializer`. Dadurch
entsprechen die Blob-Bytes exakt demselben DOM-Zustand, den der Nutzer sieht. Der Downloadname
wird ausschließlich aus dem Namen des aktuell geladenen Bildes abgeleitet.

Die UI verwendet kleine Feature-Module und zentrale Application Services:

- `imageService`: Laden, Dekodieren, Transformation und Größenänderung.
- `conversionService`: Worker, WASM-Lebenszyklus und Abbruch.
- `settingsStore`: validierte Einstellungen.
- `historyStore`: unveränderliche Runs und A/B-Auswahl.
- `exportService`: bytegenauer SVG-Download.
- `modelRegistry`: Zustandsautomat und deduplizierte Modell-Ladevorgänge.
- `webMcpAdapter`: Tool-Registrierung und Mapping auf dieselben Services.

Der sichtbare UI-Zustand wird aus diesen Stores gerendert. WebMCP besitzt keinen zweiten,
abweichenden Schattenzustand.

`historyController` rendert aus dem Store ausschließlich die zehn Karten und projiziert einen
ausgewählten SVG-Snapshot zurück in die Arbeitsfläche. Er schreibt keine alten Optionen in das
Formular. `restoreSelectedRunOptions` validiert den ausgewählten Snapshot erneut und reicht eine
Kopie an `conversionOptionsController.apply` weiter. Dieser explizite Pfad schreibt numerische
Werte, globalen Formerkennungszustand und Typauswahl und rendert die abgeleiteten Zielmaße neu;
Store, SVG und Bildzustand bleiben unverändert.

`compareSelection` hält je einen unveränderlichen Run-Verweis für A und B. Die Zuweisung desselben
Runs in den anderen Platz entfernt ihn aus dem bisherigen Platz. `compareController` rendert erst
bei zwei vollständigen Plätzen. Jeder native SVG-Snapshot liegt in einer äußeren ViewBox
`0 0 1 1` mit `xMidYMid meet`; beide Layer füllen denselben Canvas. Der 0–100-Regler setzt
komplementär `opacity(A) = 1 - B` und `opacity(B) = B`.

`compareConversionSettings` projiziert beide Options-Snapshots über eine typisierte, stabile
Schemafolge in formatierte Tabellenzeilen. Der standardmäßig aktive Differenzfilter vergleicht
vor der Formatierung numerische Werte und boolesche Formerkennungswerte. A/B-Downloads übergeben
den ursprünglichen `ConversionRun.svg`-String direkt an `downloadSvgFile`; die normalisierten
DOM-Layer werden nie serialisiert oder exportiert.

### Qualitätsgate

`npm run check` im Repository-Root ist der einzige vollständige lokale Gate. Er führt `oxfmt`,
`oxlint`, die ausführbare 1000-Zeilen-Prüfung, beide TypeScript-Projekte, schnelle Vitest-Suiten
und den Produktionsbuild aus. Für den vorhandenen Rust-Workspace folgen `cargo fmt --check`
und Clippy mit als Fehler behandelten Warnungen. `.github/workflows/check.yml` installiert das
committete Lockfile und ruft denselben Befehl auf.

## 7. WebMCP-Integration

WebMCP ist im Juli 2026 ein Entwurf und eine progressive Browserfunktion. Die Integration
verwendet Feature Detection und die aktuelle `document.modelContext`-Schnittstelle hinter
einem Adapter. Die veraltete `navigator.modelContext`-Variante wird nicht fest eingebaut.

Die komplexen Konvertierungsaktionen verwenden die imperative API. Deklarative Annotationen
können ergänzend für stabile Standardformulare eingesetzt werden, dürfen aber keine doppelte
Geschäftslogik erzeugen.

Der erste WebMCP-Slice registriert `get_capabilities`, `configure_conversion` und
`convert_current_image`. Der vollständige Produktvertrag ergänzt Workspace-Zustand, History,
A/B-Auswahl, Export, KI-Modellverwaltung und die beiden KI-Aktionen. Eine typisierte Capability
Map ordnet jedes sichtbare Application Command genau einem UI- und einem WebMCP-Einstieg zu.
Jedes Tool besitzt:

- einen stabilen, aktionsorientierten Namen.
- eine eindeutige Beschreibung ohne Inhalte aus Nutzerbildern.
- ein enges JSON-Schema mit Bereichsvalidierung.
- strukturierte Erfolgs- und Fehlerresultate.
- passende Hinweise für nur lesende und zustandsändernde Aktionen, soweit unterstützt.

Lokale Entwicklung und Abnahme verwenden Chrome 149 oder neuer mit
`chrome://flags/#enable-webmcp-testing`. Für die sichtbare Kontrolle registrierter Tools und
Aufrufe wird zusätzlich `chrome://flags/#devtools-webmcp-support` aktiviert. WebMCP benötigt
einen sichtbaren Tab, einen origin-isolierten Dokumentkontext und die `tools` Permissions
Policy. Die Abnahme prüft die Werkzeuge nicht nur gegen API-Fakes, sondern ruft sie über den
verbundenen Chrome-Agenten auf und kontrolliert dieselbe sichtbare UI.

Die produktive Abnahme des neuen Studios läuft auf `https://studio.img2.download`. Die
Hosting-Konfiguration sendet für das App-Dokument `Origin-Agent-Cluster: ?1` und
`Permissions-Policy: tools=(self)`. Ein Production-Smoke-Test prüft Header, Tool-Inventar und
den sichtbaren Ende-zu-Ende-Ablauf im Ziel-Chrome. Lokale Bilder werden über die
browserbestätigte Dateiübergabe in den aktiven Tab übernommen; alle folgenden Produktaktionen
laufen über dieselben Application Services.

Der bestehende Vorgänger auf `https://img2.download` bleibt eine getrennte Anwendung. Sein
WebMCP-Adapter lebt als kleine Integration mit eigenem Capability-Inventar und eigenem
Production-Smoke-Test. Dadurch wird keine DOM- oder Zustandslogik zwischen Vorgänger und
img2svg Studio vermischt.

Primärquellen:

- <https://developer.chrome.com/docs/ai/webmcp>
- <https://developer.chrome.com/blog/new-in-devtools-149>

### Apps-SDK-Rückfallweg

Ein eigener Implementierungsfehler löst keinen Architekturwechsel aus. Erst wenn WebMCP in
einer unterstützten und korrekt konfigurierten Chrome-Version nachweislich nicht für den
Browser-Agenten nutzbar ist, wird der WebMCP-Aktionsslice durch eine ChatGPT-App ersetzt.

Der funktionale Ersatz verwendet einen HTTP-erreichbaren MCP-Server, dessen Tools dieselben
typisierten Application Services ansprechen, sowie eine UI im ChatGPT-iframe über die MCP Apps
Bridge. Die Agentensteuerung wechselt damit von der lokalen Browserseite in die ChatGPT-Surface.
Serverbetrieb, HTTPS und Datei-/Datenschutzfluss werden dann als eigener Slice getestet und
dokumentiert. Beide Wege verwenden dieselben Application Services.

Primärquellen:

- <https://developers.openai.com/apps-sdk/build/mcp-server>
- <https://developers.openai.com/apps-sdk/build/chatgpt-ui>
- <https://developers.openai.com/apps-sdk/deploy>

## 8. KI-Modelle

`web/src/ai/model-manifest.ts` ist die einzige Quelle der Wahrheit für veröffentlichte
Browsermodelle. Jeder Eintrag enthält vollständige Hub-Revision, erwartete Artefakte mit Bytezahl
und SHA-256, kommerziell nutzbare Lizenz, Tensorformen sowie Runtime und erlaubte Backends. Die
Validierung läuft beim Modulimport und lehnt unvollständige oder nicht freigegebene Einträge ab.

Die gemeinsame Runtime ist `@huggingface/transformers` 4.2.0 mit dem darin gepinnten
`onnxruntime-web` 1.26.0-dev.20260416-b7804b056c. MODNet nutzt den revisionsgebundenen
FP32-Graphen für `float32[1,3,H,W] → float32[1,1,H,W]` über WebGPU mit WASM-Fallback. SlimSAM 77
Uniform nutzt den FP16-Vision-Encoder und den FP16-Prompt-/Mask-Decoder über WebGPU. Punkt- und
Labeltensoren erzeugen drei postprozessierte Masken in Originalgröße und zugehörige IoU-Werte.

Der spätere Modell-Manager verwendet ausschließlich diese validierten Definitionen. Parallelaufrufe
teilen dasselbe Lade-Promise. Fehler führen immer in einen sichtbaren `error`-Zustand mit Retry.
`dispose()` und Embedding-Caches werden beim Entladen berücksichtigt. Vollständige Quellen,
Lizenzketten, Größen und Prüfsummen stehen in `docs/THIRD_PARTY.md`.

## 9. Teststrategie

- Neue Funktionen entstehen als kleine vertikale Slices nach Red–Green–Refactor.
- Die Abnahme beginnt als Given–When–Then-Szenario in `TASKS.md` und wird vor der
  Implementierung direkt als ausführbarer Test codiert.
- Vitest deckt schnelle TypeScript-Verträge ab, Rusts eigener Testrunner die Engine und
  Playwright nur sichtbare kritische Browserabläufe; eine zusätzliche Cucumber-Laufzeit wird
  nicht verwendet.
- Während eines Slices läuft zuerst der kleinste aussagekräftige Test; breite Suites folgen
  vor dem Commit und an Meilenstein-Gates.
- Rust-Unit-Tests für Optionen, Detektoren und SVG-Assembly.
- Golden-Tests für kanonische SVG-Ausgabe.
- Pixelvergleich über `resvg`/`tiny-skia` für repräsentative Fixtures.
- Property-/Grenzwerttests für ungültige Dimensionen und Parameter.
- TypeScript-Tests für Stores, Diff, Größen und Tool-Schemas.
- Browser-Tests für Upload, Run, History, A/B, Export und Fehlerzustände.
- WebMCP-End-to-End-Test im unterstützten Chrome-Build.
- Manueller Demo-Smoke-Test vor Release.

Alle handgeschriebenen Quell- und Testdateien bleiben unter 1000 physischen Zeilen. Ein
automatischer Check erzwingt diese Grenze. Weitere verbindliche Regeln stehen in
`docs/ENGINEERING_STANDARDS.md`.

## 10. Build und Auslieferung

- Rust-Formatierung und Clippy mit Warnungen als Fehler.
- WASM-Build über `npm run build:wasm`, intern `wasm-pack 0.15.0 --target web --release`, und
  anschließende Optimierung.
- Web-Build über Vite und exakt gepinntes TypeScript 7.0.2 mit reproduzierbarem Lockfile.
- Versionierte generierte WASM-Bindings, damit der Web-Build keinen Rust-Toolchain-Download
  voraussetzt; Rust-Änderungen regenerieren sie bewusst im selben Diff.
- Statische Auslieferung mit strenger Content Security Policy, soweit KI-Modellquellen dies
  zulassen.
- Abhängigkeits- und Lizenzbericht für Rust, JavaScript und Modelle.
