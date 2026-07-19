# img2svg Studio

img2svg Studio wird eine vollständig clientseitige Web-Anwendung zur kontrollierten
Umwandlung von Rasterbildern in hochwertige, nachvollziehbare SVGs. Der Schwerpunkt liegt
nicht nur auf der Konvertierung, sondern auf einem experimentellen Workflow: Einstellungen
variieren, Ergebnisse in einer History vergleichen, Parameterunterschiede verstehen und den
gesamten Ablauf optional durch einen Browser-Agenten über WebMCP steuern. Die produktive
Abnahme des neuen Studios ist auf `https://studio.img2.download` vorgesehen. Der bestehende
Vorgänger auf `https://img2.download` erhält einen getrennten WebMCP-Adapter.

## Projektstatus

Die responsive Studio-Oberfläche läuft lokal. Sie zeigt Kopfzeile, Parameterleiste,
A/B-Arbeitsfläche, Parametervergleich, leeren Verlauf und Statuszeile. Bildverarbeitung und
Interaktionen folgen in den nächsten vertikalen Slices.

## Lokal starten

Voraussetzung ist Node.js 22.14 oder neuer.

```bash
npm ci
npm run dev --workspace=img2svg-studio-web
```

Der Entwicklungsserver zeigt die Anwendung unter `http://127.0.0.1:5173`.

```bash
npm run build
npm run test:e2e --workspace=img2svg-studio-web -- app-shell.spec.ts
```

## Qualitätsprüfung

```bash
npm run check
```

Dieser Befehl prüft Formatierung, Lint, das 1000-Zeilen-Limit, TypeScript, schnelle Tests und
den Produktionsbuild. Sobald `Cargo.toml` vorhanden ist, kommen `cargo fmt --check` und Clippy
automatisch hinzu. GitHub Actions führt exakt denselben Befehl aus.

## Leitprinzipien

- Bildverarbeitung bleibt lokal; Netzwerkzugriffe dienen statischen Ressourcen und bewusst
  gestarteten Modell-Downloads.
- Rust/WebAssembly übernimmt die deterministische Vektorisierung.
- `visioncortex` liefert die bewährte Grundlage für Clustering und Kontur-Tracing.
- Native SVG-Formen sind eine optionale, pro Formtyp steuerbare Verbesserung.
- Nicht erkannte Inhalte bleiben als SVG-Pfade erhalten.
- History und A/B-Vergleich bilden den Kernworkflow.
- WebMCP ergänzt die vollständig bedienbare Browseroberfläche progressiv.

## Verbindliche Projektdokumente

- [Projektidee](docs/PROJECT_BRIEF.md)
- [Produktspezifikation](docs/PRODUCT_SPEC.md)
- [Technische Spezifikation](docs/TECHNICAL_SPEC.md)
- [Engineering-Standards](docs/ENGINEERING_STANDARDS.md)
- [Fortlaufendes Handbuch](docs/HANDBOOK.md)
- [Build-Week-Einreichungsplan](docs/SUBMISSION.md)
- [Entscheidungsprotokoll](docs/DECISIONS.md)
- [Offene Umsetzungstasks](TASKS.md)

## Repository-Struktur

```text
img2svg/
├── crates/
│   ├── img2svg-core/     # Plattformunabhängige Engine
│   └── img2svg-wasm/     # wasm-bindgen-Schnittstelle
├── web/                  # Vite + TypeScript, UI und WebMCP
├── docs/                 # Produkt-, Technik- und Entscheidungsdokumentation
├── fixtures/             # Kleine, lizenzfreie Testmotive
└── TASKS.md              # Priorisierte Arbeitsliste mit Abnahmekriterien
```

Die Implementierung erfolgt testgetrieben in kleinen vertikalen Slices. Eigene Quell- und
Testdateien dürfen 1000 Zeilen nicht überschreiten; minimale, sachbezogene Git-Diffs sind
verbindlich.

## Lizenz

Die finale Projektlizenz ist noch zu bestätigen. Die Ausgangsspezifikation sieht BSL 1.1
vor; falls die Hackathon-Regeln eine OSI-Lizenz verlangen, ist Apache 2.0 vorgesehen. Bis
zur dokumentierten Entscheidung wird kein widersprüchlicher Lizenztext veröffentlicht.
