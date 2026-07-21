# Rückblick auf die Teststrategie

Stand: 21. Juli 2026. Die Git-Historie zeigt sowohl erwartete Red-Phasen als auch Fehler, die erst
durch ausführbare oder visuelle Abnahme sichtbar wurden.

## Was tatsächlich gefunden wurde

- `c5cd67a`: Chrome deckte einen echten Hidden-State-Fehler auf. Danach wurde eine rote
  Regressionserwartung ergänzt und die globale `[hidden]`-Regel korrigiert.
- `33fab7e`: Die visuelle A/B-Abnahme fand verzerrte Seitenverhältnisse und überlappende Labels.
- `0f64340`: Die englische Chrome-Abnahme fand unübersetzte Laufzeittexte und falsche
  Dezimaldarstellung bei MiB.
- `361157a`: Die Fähigkeitsprüfung verhindert, dass SlimSAM auf Geräten ohne erforderliches
  WebGPU-Feature angeboten wird.
- `65e9097`: Ein reproduzierbarer Rust-Vertrag schützt den später gemeldeten Transparenzfehler und
  den vollständigen RGB-Suchraum.
- `260721.11`: Die vollständige E2E-Suite fand die mehrdeutige zugängliche Benennung von „Preset“
  und seinem Namensfeld; das Eingabefeld erhielt daraufhin einen eindeutig unterscheidbaren Namen.

Die in `43ff761` und `0d5cf0a` dokumentierten roten TDD-Läufe beweisen dagegen hauptsächlich, dass
neue Verträge vor ihrer Implementierung fehlgeschlagen sind. Das ist korrekte Testreihenfolge,
aber kein zusätzlich entdeckter Produktfehler.

## Konsequenz

TDD war nicht überflüssig: Es hat besonders an Engine-, Zustands- und Browsergrenzen Fehler
reproduzierbar gemacht. Eine flächendeckende Unit-Testpflicht für statische Texte oder reine
CSS-Dekoration wäre jedoch unnötig.

Für kommende Slices gilt deshalb eine schlanke Risikostrategie:

1. Engine-Geometrie, Raster-/Transparenzverarbeitung und WASM-Grenzen bleiben deterministisch
   testgetrieben.
2. Persistenz, Verlauf, Presets und WebMCP-Schemas erhalten kleine Unit-Verträge.
3. Pro sichtbarem Workflow genügt ein End-to-End-Szenario; Responsive- und Stacking-Verhalten wird
   in einem mobilen Browser-Viewport geprüft.
4. Statische Beschriftung und reine Darstellung werden über Lint, Build und die reale
   Chrome-Abnahme abgesichert.
