# Codemap

Diese Karte ist der kurze Einstieg für Änderungen am img2svg Studio. Sie zeigt, wo Verhalten
beginnt, welche Grenze es durchläuft und wo es geprüft wird. Bei einer geänderten Zuständigkeit
oder einem neuen Datenfluss wird diese Datei im selben Commit aktualisiert.

## Leseweg vor einer Änderung

1. Den gewünschten Nutzereffekt und den offenen Slice in `TASKS.md` lesen.
2. In der Änderungskarte unten die kleinste zuständige Domäne bestimmen.
3. Deren Controller, pure Logik und nächstgelegenen Test lesen.
4. Nur bei einer berührten Systemgrenze dem jeweiligen Datenfluss folgen.
5. Vor dem Commit den betroffenen Vertrag, die Browserabnahme und das Handbuch prüfen.

`docs/ARCHITECTURE.md` erklärt die stabilen Systemgrenzen. Diese Codemap nennt die konkreten
Dateien. `docs/TECHNICAL_SPEC.md` beschreibt öffentliche Verträge; `docs/HANDBOOK.md` beschreibt
das sichtbare Produkt.

## Einstiegspunkte

| Laufzeit | Einstieg | Verantwortung |
| --- | --- | --- |
| Browser-Dokument | `web/index.html` | Semantische App-Struktur und alle festen Bedienelemente |
| Browser-App | `web/src/main.ts` | Controller verdrahten; enthält keine Fachlogik |
| Globale Darstellung | `web/src/styles.css` | Shell, Panels und gemeinsam genutzte Basiselemente |
| Konvertierungs-Worker | `web/src/conversion/conversion-worker.ts` | Nachricht annehmen, WASM laden und Ergebnis zurückgeben |
| WASM-Grenze | `crates/img2svg-wasm/src/lib.rs` | Typisierte Browserwerte in Rust-Core-Werte übersetzen |
| Rust-Core | `crates/img2svg-core/src/lib.rs` | RGBA validieren, Tracing ausführen und SVG zusammensetzen |
| MCP-Prozess | `mcp/src/server.ts` | Stateless Streamable-HTTP-Server starten |
| MCP-App | `mcp/src/mcp-app.ts` | Tools und Widget-Ressource registrieren |
| PWA und Cache-Version | `release/app-version.ts`, `vite.config.ts`, `web/public/_headers`, `web/public/service-worker.js` | versionierte Assets und Share-/File-Eingang ohne dauerhaften App-Cache |

## Änderungskarte

| Gewünschte Änderung | Primäre Dateien | Zugehörige Abnahme |
| --- | --- | --- |
| Bild laden, validieren oder Demo öffnen | `web/src/image/image-loader.ts`, `decode-image.ts`, `image-store.ts` | `load-image.spec.ts`, Image-Unit-Tests |
| Logo- oder Topografie-Benchmark | `web/benchmarks/benchmark-runner.ts`, jeweilige Benchmark-Konfiguration | produktiver Chrome-Lauf und Ergebnisdokument unter `docs/release/` |
| Raster vor dem Tracing skalieren oder filtern | `web/src/conversion/raster-preprocessing.ts`, `read-raster-pixels.ts` | `raster-preprocessing.test.ts`, `preprocess-raster.spec.ts` |
| Raster- und SVG-Bytegrößen formatieren | `web/src/format-byte-size.ts`, `image-loader.ts`, `history-controller.ts` | `format-byte-size.test.ts`, sichtbarer Chrome-Verlauf |
| Vektorisierungsparameter, Defaults oder Presets | `conversion-options.ts`, `conversion-options-controller.ts`, `conversion-presets.ts` | zugehörige Unit-Tests, `change-parameters.spec.ts`, `vectorization-handbook.spec.ts` |
| Live-Entwurf gegen Original oder Ergebnis annehmen | `conversion-controller.ts`, `history-controller.ts`, `comparison-source.ts` | `live-preview.spec.ts`, Compare-Unit-Tests |
| Worker-/WASM-Vertrag | `conversion-worker-contract.ts`, `conversion-worker.ts`, `crates/img2svg-wasm/src/lib.rs` | Typecheck, Web-E2E, Rust-Tests |
| Tracing-Fortschritt | `conversion-progress.ts`, `conversion-controller.ts`, `img2svg-core/src/lib.rs` | Progress-Unit-/Rust-Tests, `conversion-progress.spec.ts` |
| Rust-Tracing oder SVG-Ausgabe | `crates/img2svg-core/src/lib.rs` | `default_conversion.rs`, `conversion_errors.rs` |
| Engine-Optionen und Validierung | `crates/img2svg-core/src/conversion_options.rs` | `conversion_options.rs` in Core-Tests |
| Native Formerkennung | `shape_detection.rs`, `visioncortex_shape.rs` | `detect_*.rs`, `shape_detection_fallback.rs`, passende Browser-Specs |
| Historie und Wiederherstellung | `history-store.ts`, `history-controller.ts`, `restore-run.ts`, `history.css` | History-Unit-Tests, `history.spec.ts`, `restore-run.spec.ts` |
| Header, Sidebar oder Verlauf anordnen | `layout/layout-preferences.ts`, `layout-preferences.css` | Layout-Unit-Test, `layout-preferences.spec.ts` |
| Startleistung und Rasterempfehlung | `hardware/hardware-profile.ts`, `conversion-options-controller.ts` | Hardware-Unit-Test, `hardware-profile.spec.ts` |
| Laufende Konvertierung abbrechen | `conversion-service.ts`, `conversion-controller.ts` | Worker-Lifecycle-Test, `cancel-conversion.spec.ts` |
| A/B-Auswahl und Parameter-Diff | `compare-selection.ts`, `compare-controller.ts`, `diff-settings.ts` | Compare-Unit-Tests, `compare-runs.spec.ts` |
| Synchroner Zoom, Pan oder Splitter | `viewport-state.ts`, `viewport-controller.ts`, `compare-split.css` | Viewport-Unit-Test, `compare-original-viewport.spec.ts` |
| Arbeitsfläche wechseln und Rasterwerkzeuge freigeben | `workspace-view-controller.ts`, Raster-Tool-Controller | Workspace-Unit-Test, Konvertierungs- und Auswahl-E2E |
| Sprache oder sichtbare Texte | `i18n/localization.ts`, `web/index.html` | `localization.test.ts`, `localization.spec.ts` |
| Kontext-Handbuch | `help/interactive-handbook.ts`, `interactive-handbook.css`, `docs/HANDBOOK.md` | `vectorization-handbook.spec.ts` |
| Rechtsklick-Aktionen und Einzelreset | `context-menu/context-menu-controller.ts`, `conversion-option-key.ts`, `conversion-options-controller.ts` | `context-menu.spec.ts`, Option-Key-Unit-Test |
| Zauberstab-Auswahl | `selection/magic-wand-selection.ts`, `magic-wand-controller.ts`, `magic-wand.css` | Selection-Unit-Tests, `magic-wand.spec.ts` |
| AI-Modell laden/entladen | `model-registry.ts`, `browser-model-loader.ts`, `model-manager.ts` | Model-Unit-Tests, `model-lifecycle.spec.ts` |
| Hintergrund entfernen | `background-removal-controller.ts`, `modnet-adapter.ts` | Adapter-Tests, `remove-background.spec.ts` |
| Smart Select | `smart-select-controller.ts`, `sam-selection.ts`, `sam-adapter.ts` | Selection-Tests, `smart-select.spec.ts` |
| Browser-AI-Verfügbarkeit | `browser-ai-capabilities.ts` | Capability-Test und `ai-capabilities.spec.ts` |
| WebMCP im Studio | `webmcp/studio-tools.ts`, `conversion-tools.ts`, `webmcp-adapter.ts` | WebMCP-Unit-Tests und `webmcp-*.spec.ts` |
| ChatGPT-MCP-Konvertierung | `mcp/src/vectorize-service.ts`, `vectorize-options.ts`, `image-input.ts` | MCP-Unit- und Server-Vertragstests |
| ChatGPT-MCP-Regionen | `mcp/src/image-region-service.ts`, `connected-region.ts` | Regions- und MCP-Server-Vertragstests |
| ChatGPT-Vorschauwidget | `mcp/src/preview-widget.ts`, `mcp/src/mcp-app.ts` | Widget- und MCP-Server-Tests |
| PWA-Share/File-Open | `pwa/pwa-ingress.ts`, Manifest, Service Worker | PWA-Unit-Test und `pwa-image-ingress.spec.ts` |
| Version, Recht und Deployment | `release/app-version.ts`, `web/public/*.html`, `web/public/_headers` | Release-, Legal- und Demo-Specs |
| Vorgänger img2.download | `integrations/img2-download/` | Capability-Test und `predecessor-webmcp.spec.ts` |

Pfade ohne Präfix in der Tabelle liegen unter `web/src/`. Rust-Testpfade liegen unter
`crates/img2svg-core/tests/`.

## Kritische Datenflüsse

### Bild zu interaktiver SVG-Vorschau

```text
image-loader
  -> image-store (Original und aktuelle Version)
  -> conversion-options-controller (typisierte aktuelle Optionen)
  -> conversion-controller (entprellte Anfrage, veraltete Ergebnisse verwerfen)
  -> conversion-service
  -> conversion-worker
  -> img2svg-wasm
  -> img2svg-core
  -> history-controller (eine ungespeicherte Entwurfsquelle)
  -> compare-selection (Original A, Entwurf B)
  -> workspace-view-controller + viewport-controller
```

Der Entwurf ist sichtbar in der Historie, bleibt aber außerhalb des `history-store`. Nur
`conversion-controller.convert()` ersetzt ihn durch einen unveränderlichen Run. Ein Sliderwechsel
aktualisiert daher sofort B, erzeugt aber noch keine Variante.

### Angenommener Run zu A/B-Vergleich

```text
conversion-controller
  -> history-controller.record
  -> history-store (unveränderlicher Run mit SVG, Metriken und Optionen)
  -> compare-selection (Original A, angenommener Run B)
  -> compare-controller
  -> workspace-view-controller + viewport-controller
```

Original, A und B verwenden dieselbe Viewport-Transformation. Der Splitter beschneidet zwei
deckungsgleiche Ebenen; er ordnet keine getrennten Bilder nebeneinander an.

### Lokale AI zu neuer Bildversion

```text
sichtbare Nutzeraktion
  -> model-registry (Download, Integrität, Backend, Lebenszyklus)
  -> MODNet oder SlimSAM Adapter
  -> image-loader mit abgeleiteter Bildversion
  -> normaler Vorschau- und Historienfluss
```

Kein Modell wird allein durch den Seitenstart geladen. Eine abgeleitete Version ersetzt das
Original nicht; Wiederherstellung bleibt möglich.

### Zauberstab zu manueller Bildversion

```text
magic-wand-controller
  -> read-raster-pixels
  -> magic-wand-selection (Klickpunkt, Empfindlichkeit, zusammenhängende Maske)
  -> sichtbares Masken-Canvas
  -> ausdrückliche Entfernung
  -> encode-raster-png
  -> image-loader als manuelle Version
  -> normaler Vorschau- und Historienfluss
```

Die Empfindlichkeit ändert nur die sichtbare Maske. Erst die Schaltfläche „Auswahl entfernen“
verändert den Alpha-Kanal; ein Modelldownload gehört nicht zu diesem Pfad.

### WebMCP

```text
document.modelContext
  -> webmcp-adapter (Feature-Erkennung und Registrierung)
  -> eng typisiertes Studio-Tool
  -> derselbe Controller wie der sichtbare Button
  -> sichtbare Zustandsänderung und strukturierte Antwort
```

WebMCP ist ein zusätzlicher Eingang, keine zweite Anwendungslogik. Fehlt die Browserfunktion,
bleibt die vollständige UI bedienbar.

### Stateless ChatGPT-MCP

```text
Streamable HTTP
  -> mcp-app Tool-Schema
  -> image-input (Dateireferenz/Base64 und Limits)
  -> image-region-service (normierte Randregionen und transparentes PNG)
  -> vectorize-options
  -> vectorize-service
  -> generiertes Node-WASM des Rust-Cores
  -> SVG + Statistiken
  -> preview-widget als isolierte MCP-App-Ressource
```

Dieser Prozess ist bewusst getrennt vom lokalen Browserzustand und hält weder Bilder noch Runs.

## Zustandsbesitz und Invarianten

- `image-store.ts` besitzt Original und aktive Bildversion; Controller kopieren diesen Zustand
  nicht.
- `history-store.ts` besitzt angenommene Runs der aktuellen Session; Vorschauen gehören nicht
  hinein.
- `compare-selection.ts` besitzt ausschließlich die Identitäten der A/B-Quellen.
- `conversion-options-controller.ts` ist die UI-Wahrheit für Optionen; Presets und Restore laufen
  durch seine typisierte `apply`-Grenze.
- `model-registry.ts` besitzt jede geladene AI-Session und deren Freigabe.
- `selection-activity.ts` lässt höchstens ein interaktives Auswahlwerkzeug die Arbeitsfläche
  besitzen.
- Rust validiert Dimensionen und Engine-Optionen erneut; TypeScript-Validierung ersetzt diese
  Vertrauensgrenze nicht.
- Nutzerbilder, SVG-Runs und abgeleitete Bilder bleiben im Browser. Nur der ausdrücklich verwendete
  ChatGPT-MCP-Pfad verarbeitet eine Eingabe im stateless Companion.
- Handgeschriebene Dateien bleiben unter 1000 Zeilen. Ab 600 Zeilen wird im Review geprüft, ob
  mehr als eine Verantwortung enthalten ist; `npm run check:lines` erzwingt die Obergrenze.

## Verzeichnisübersicht

```text
crates/
  img2svg-core/       Deterministische Engine, Optionen und Formerkennung
  img2svg-wasm/       Kleine WASM-Übersetzungsschicht
web/
  src/                Browser-Domänen, Controller und nahe Unit-Tests
  e2e/                Sichtbare Verträge in Playwright
  public/             Statische PWA-, Legal- und Deployment-Dateien
  benchmarks/         Gemessene Logo-Optimierung
mcp/src/              Stateless MCP-Server, Tools und Widget
integrations/         Getrennter Adapter für img2.download
fixtures/             Kleine reproduzierbare Raster- und Geometrieeingaben
scripts/              Repository-Qualitätsprüfungen
docs/                 Produkt-, Architektur-, Betriebs- und Nutzungsverträge
```

`web/src/wasm-pkg/` und `mcp/dist/` sind erzeugte Artefakte. Fachänderungen beginnen in Rust oder
TypeScript-Quellen und werden anschließend über die vorhandenen Build-Befehle regeneriert.

## Abnahmerouten

- Schnellster Logiktest: nächstgelegene `*.test.ts` oder ein einzelner Rust-Test.
- Gesamtes Repository: `npm run check`.
- Sichtbare Browserverträge: `npm --prefix web run test:e2e`.
- Jury-Happy-Path im echten Chrome: `npm --prefix web run test:demo`.
- Direkte Produktabnahme: Produktionsbuild lokal starten, Ablauf in Google Chrome bedienen und
  sichtbaren Zustand, Konsole sowie unerwartete Requests prüfen.

Die Browserabnahme folgt dem Nutzerweg und nicht der Modulstruktur. Ein strukturelles Refactoring
ist erst abgeschlossen, wenn derselbe sichtbare Ablauf unverändert funktioniert.
