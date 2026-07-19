# Technische Spezifikation

## 1. Architektur

Das Repository wird als Rust-Workspace mit separater Web-Anwendung aufgebaut:

- `img2svg-core`: deterministische, plattformunabhängige Engine ohne Browserabhängigkeit.
- `img2svg-wasm`: schmale `wasm-bindgen`-Schnittstelle und serialisierbare Resultate.
- `img2svg-cli`: optionale native CLI, die dieselbe Core-API verwendet.
- `web`: Vite + TypeScript ohne schweres UI-Framework; UI, Canvas, Worker, History, Exporte,
  Modellverwaltung und WebMCP.

Die Engine kennt keine DOM- oder Dateiauswahl. Die Web-App kennt keine Tracing-Details.

## 2. Datenfluss

```text
Datei / Drop
  → Browser-Decoder
  → unveränderliches Original-RGBA
  → Transformation und Zielgröße
  → optionale Vorverarbeitung
  → RGBA + validierte ConversionOptions an WASM-Worker
  → Clustering und Tracing
  → optionale Erkennung ausgewählter Formen
  → PathOptimizer und SVG-Assembly
  → ConversionResult { svg, stats, warnings }
  → History / Anzeige / Export / A-B
```

CPU-intensive WASM-Aufrufe laufen außerhalb des UI-Threads, sobald das Gerüst stabil ist.

## 3. Zentrale Domänenmodelle

`ConversionOptions` enthält mindestens:

- Farb-Clustering: Präzision, Speckle-Filter, Hierarchie, Gradientenschritt.
- Kurven: Ecken-, Splice- und Segmentparameter sowie Kurven an/aus.
- Output: Dezimalpräzision, relative Koordinaten, Optimierung.
- Formerkennung: global an/aus, aktivierte Typen und Schwellenwerte.
- Reststrategie: `path`, `ignore` oder `raster`.
- Zielgröße und Resampling-Strategie werden in der Web-Pipeline festgehalten.

Eine kanonische Schemaquelle erzeugt oder speist:

- Rust-Validierung.
- TypeScript-Typen und Standardwerte.
- UI-Metadaten.
- History-Diff.
- WebMCP-Inputschema.

`ConversionResult` enthält SVG, Maße, Laufzeitstatistiken, Shape-Zählungen, Pfadanzahl,
Transparenz, Optimizer-Vergleich und nicht fatale Warnungen.

## 4. Engine-Module

Vorgesehene Core-Module:

```text
config        Validierung und Defaults
color         Farb- und Alpha-Hilfen
clustering    Adapter um visioncortex
contours      Kontur- und Maskenmodelle
detect        Kreis, Ellipse, Rechteck, Linie, Polygon
path          interne Pfadrepräsentation und Parser
optimize      kanonische, größenoptimierte Pfadausgabe
svg           deterministische Assembly und Escaping
pipeline      Orchestrierung und Statistik
error         öffentliche Fehlertypen
```

`visioncortex` wird als Abhängigkeit verwendet, nicht kopiert. Herkunft, Version und Lizenz
werden dokumentiert. Übernommene oder adaptierte Algorithmen erhalten konkrete Hinweise.

## 5. Determinismus

- Stabile Reihenfolge für Cluster, Konturen, Attribute und Statistiken.
- Keine iteration-order-abhängigen Hashmaps in serialisierter Ausgabe.
- Kanonische Float- und Farbformatierung.
- Feste Rundungsregeln, keine locale-abhängige Ausgabe.
- Fixtures testen zwei identische Runs auf String-Gleichheit.
- Build-Metadaten dürfen nicht ungefragt in den SVG-String gelangen.

## 6. Web-Anwendung

Die UI verwendet kleine Feature-Module und zentrale Application Services:

- `imageService`: Laden, Dekodieren, Transformation und Größenänderung.
- `conversionService`: Worker, WASM-Lebenszyklus und Abbruch.
- `settingsStore`: validierte Einstellungen und Presets.
- `historyStore`: unveränderliche Runs und A/B-Auswahl.
- `exportService`: SVG und Browser-Rasterformate.
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

Jedes Tool besitzt:

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

- Rust-Unit-Tests für Optionen, Detektoren, Parser und Optimizer.
- Golden-Tests für kanonische SVG-Ausgabe.
- Pixelvergleich über `resvg`/`tiny-skia` für repräsentative Fixtures.
- Property-/Grenzwerttests für ungültige Dimensionen und Parameter.
- TypeScript-Tests für Stores, Diff, Presets, Größen und Tool-Schemas.
- Browser-Tests für Upload, Run, History, A/B, Export und Fehlerzustände.
- WebMCP-End-to-End-Test im unterstützten Chrome-Build.
- Manueller Demo-Smoke-Test vor Release.

## 10. Build und Auslieferung

- Rust-Formatierung und Clippy mit Warnungen als Fehler.
- WASM-Build über `wasm-pack --target web` und anschließende Optimierung.
- Web-Build über Vite mit reproduzierbaren Lockfiles.
- Statische Auslieferung mit strenger Content Security Policy, soweit KI-Modellquellen dies
  zulassen.
- Abhängigkeits- und Lizenzbericht für Rust, JavaScript und Modelle.
