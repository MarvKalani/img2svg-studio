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

`ConversionOptions` enthält Farbpräzision, Speckle-Filter, proportionale Zielgröße sowie den
globalen Formerkennungsschalter und aktivierte Formtypen. Nicht erkannte Konturen bleiben Pfade.

Eine kanonische Schemaquelle erzeugt oder speist:

- Rust-Validierung.
- TypeScript-Typen und Standardwerte.
- UI-Metadaten.
- History-Diff.
- WebMCP-Inputschema.

`ConversionResult` enthält SVG, Maße, wirksame Einstellungen, Laufzeit, Dateigröße,
Shape-Zählungen, Pfadanzahl, Transparenz und nicht fatale Warnungen.

## 4. Engine-Module

Vorgesehene Core-Module:

```text
config        Validierung und Defaults
clustering    Adapter um visioncortex
detect        Kreis, Ellipse, Rechteck, Linie, Polygon
svg           deterministische Assembly und Escaping
pipeline      Orchestrierung und Statistik
error         öffentliche Fehlertypen
```

`visioncortex` wird als Abhängigkeit verwendet, nicht kopiert. Herkunft, Version und Lizenz
werden dokumentiert. Übernommene oder adaptierte Algorithmen erhalten konkrete Hinweise.

## 5. Determinismus

- Stabile Reihenfolge für Cluster, Konturen, Attribute und Statistiken.
- Keine iteration-order-abhängigen Hashmaps in serialisierter Ausgabe.
- Kanonische Zahlen- und Farbformatierung.
- Feste Rundungsregeln, keine locale-abhängige Ausgabe.
- Fixtures testen zwei identische Runs auf String-Gleichheit.
- Build-Metadaten dürfen nicht ungefragt in den SVG-String gelangen.

## 6. Web-Anwendung

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

## 7. WebMCP-Integration

WebMCP ist im Juli 2026 ein Entwurf und eine progressive Browserfunktion. Die Integration
verwendet Feature Detection und die aktuelle `document.modelContext`-Schnittstelle hinter
einem Adapter. Die veraltete `navigator.modelContext`-Variante wird nicht fest eingebaut.

Die komplexen Konvertierungsaktionen verwenden die imperative API. Deklarative Annotationen
können ergänzend für stabile Standardformulare eingesetzt werden, dürfen aber keine doppelte
Geschäftslogik erzeugen.

Das Submission-MVP registriert nur `get_capabilities`, `configure_conversion` und
`convert_current_image`. Jedes Tool besitzt:

- einen stabilen, aktionsorientierten Namen.
- eine eindeutige Beschreibung ohne Inhalte aus Nutzerbildern.
- ein enges JSON-Schema mit Bereichsvalidierung.
- strukturierte Erfolgs- und Fehlerresultate.
- passende Hinweise für nur lesende und zustandsändernde Aktionen, soweit unterstützt.

Da WebMCP einen sichtbaren Browserkontext benötigt, umfasst der End-to-End-Test einen echten
Tab. Die Integration bleibt austauschbar, wenn sich der Entwurf ändert.

## 8. KI-Modelle

Die Modell-Registry ist die einzige Quelle der Wahrheit. Parallelaufrufe teilen dasselbe
Lade-Promise. Fehler führen immer in einen sichtbaren `error`-Zustand mit Retry. `dispose()`
und Embedding-Caches werden beim Entladen berücksichtigt.

Defaultmodelle laut Ausgangsspezifikation:

- MODNet für Hintergrundentfernung.
- SAM 1 für Smart Select.

Modellname, konkrete Revision, tatsächliche Lizenz und Transformers.js-Version werden erst
nach erneuter Quellenprüfung im Implementierungs-Task gepinnt. Nicht kommerziell lizenzierte
Modelle sind ausgeschlossen.

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
- WASM-Build über `wasm-pack --target web` und anschließende Optimierung.
- Web-Build über Vite und exakt gepinntes TypeScript 7.0.2 mit reproduzierbarem Lockfile.
- Statische Auslieferung mit strenger Content Security Policy, soweit KI-Modellquellen dies
  zulassen.
- Abhängigkeits- und Lizenzbericht für Rust, JavaScript und Modelle.
