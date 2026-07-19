# img2svg Studio

img2svg Studio wird eine vollständig clientseitige Web-Anwendung zur kontrollierten
Umwandlung von Rasterbildern in hochwertige, nachvollziehbare SVGs. Der Schwerpunkt liegt
nicht nur auf der Konvertierung, sondern auf einem experimentellen Workflow: Einstellungen
variieren, Ergebnisse in einer History vergleichen, Parameterunterschiede verstehen und den
gesamten Ablauf optional durch einen Browser-Agenten über WebMCP steuern.

## Projektstatus

Das Repository befindet sich in der Planungs- und Aufbauphase. Die konsolidierten
Anforderungen und die ausführbare Taskliste bilden die verbindliche Grundlage für die
Implementierung.

## Leitprinzipien

- Bilder bleiben lokal im Browser; es gibt kein Anwendungs-Backend und keine Telemetrie.
- Rust/WebAssembly übernimmt die deterministische Vektorisierung.
- `visioncortex` liefert die bewährte Grundlage für Clustering und Kontur-Tracing.
- Native SVG-Formen sind eine optionale, pro Formtyp steuerbare Verbesserung.
- Nicht erkannte Inhalte bleiben standardmäßig als optimierte SVG-Pfade erhalten.
- History und A/B-Vergleich sind Kernfunktionen, keine nachträglichen Extras.
- WebMCP wird als progressive Erweiterung implementiert; die Anwendung bleibt ohne WebMCP
  vollständig bedienbar.

## Verbindliche Projektdokumente

- [Projektidee](docs/PROJECT_BRIEF.md)
- [Produktspezifikation](docs/PRODUCT_SPEC.md)
- [Technische Spezifikation](docs/TECHNICAL_SPEC.md)
- [Engineering-Standards](docs/ENGINEERING_STANDARDS.md)
- [Build-Week-Einreichungsplan](docs/SUBMISSION.md)
- [Entscheidungsprotokoll](docs/DECISIONS.md)
- [Umsetzungsliste](TASKS.md)

## Geplante Repository-Struktur

```text
img2svg/
├── crates/
│   ├── img2svg-core/     # Plattformunabhängige Engine
│   ├── img2svg-wasm/     # wasm-bindgen-Schnittstelle
│   └── img2svg-cli/      # Optionale native CLI
├── web/                  # Vite + TypeScript, UI und WebMCP
├── docs/                 # Produkt-, Technik- und Entscheidungsdokumentation
├── fixtures/             # Kleine, lizenzfreie Testmotive
└── TASKS.md              # Priorisierte Arbeitsliste mit Abnahmekriterien
```

Die Build-Anleitung wird mit dem lauffähigen Gerüst in Meilenstein M0 ergänzt.

Die Implementierung erfolgt testgetrieben in kleinen vertikalen Slices. Eigene Quell- und
Testdateien dürfen 1000 Zeilen nicht überschreiten; minimale, sachbezogene Git-Diffs sind
verbindlich.

## Lizenz

Die finale Projektlizenz ist noch zu bestätigen. Die Ausgangsspezifikation sieht BSL 1.1
vor; falls die Hackathon-Regeln eine OSI-Lizenz verlangen, ist Apache 2.0 vorgesehen. Bis
zur dokumentierten Entscheidung wird kein widersprüchlicher Lizenztext veröffentlicht.
