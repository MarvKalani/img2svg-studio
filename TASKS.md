# Umsetzungsliste

## Arbeitsregeln

- Aufgaben werden in Reihenfolge ihrer Abhängigkeiten bearbeitet.
- Eine Aufgabe gilt erst als erledigt, wenn ihre Abnahmekriterien geprüft sind.
- Jeder Meilenstein endet mit einem lauffähigen, überprüften Stand.
- Neue Entscheidungen werden in `docs/DECISIONS.md` dokumentiert.
- Änderungen an Parametern müssen Engine, UI, History-Diff und WebMCP gemeinsam beachten.
- Vor jedem Release werden Lizenzen und aktuelle Modell-/WebMCP-Annahmen erneut geprüft.

## Statuslegende

- `[ ]` offen
- `[x]` abgeschlossen
- Aufgaben mit **BLOCKER** benötigen eine Entscheidung, bevor der bezeichnete Folgeschritt
  abgeschlossen werden kann.

## P0 — Planungsbasis

- [x] **P0-01 Projektbrief konsolidieren.**
  - Abnahme: Problem, Lösung, Ziele, Nicht-Ziele und Demo sind dokumentiert.
- [x] **P0-02 Produkt- und Technikgrundlage konsolidieren.**
  - Abnahme: Spätere Chatentscheidungen ersetzen widersprüchliche Ausgangspunkte sichtbar.
- [x] **P0-03 Ausführbare Taskliste anlegen.**
  - Abnahme: Jeder Meilenstein besitzt konkrete Aufgaben und ein Gate.
- [ ] **P0-04 Hackathon-Regeln und Projektlizenz bestätigen — BLOCKER für Release.**
  - Ergebnis in D-009 dokumentieren.
  - Abnahme: `LICENSE.md`, README-Formulierung und Header-Vorlage widersprechen sich nicht.

## M0 — Lauffähiges Gerüst

- [ ] **M0-01 Rust-Workspace erstellen.**
  - Crates `img2svg-core`, `img2svg-wasm` und `img2svg-cli` anlegen.
  - Features und Abhängigkeiten pro Ziel sauber trennen.
  - Abnahme: `cargo check --workspace` läuft.
- [ ] **M0-02 Web-App mit Vite und TypeScript erstellen.**
  - Module, CSS, Tests und feste Paketversionen einrichten.
  - Abnahme: Entwicklungsserver und Produktions-Build laufen.
- [ ] **M0-03 WASM-Brücke integrieren.**
  - `get_version` und minimale Initialisierung implementieren.
  - Abnahme: Web-App zeigt die geladene Engine-Version.
- [ ] **M0-04 Qualitätsbefehle einrichten.**
  - Formatierung, Clippy, Typecheck, Lint und Tests als dokumentierte Skripte.
  - Abnahme: ein lokaler `check`-Ablauf führt alle vorhandenen Prüfungen aus.
- [ ] **M0-05 CI für Checks und Builds einrichten.**
  - Keine Veröffentlichung oder Deployment-Secrets anlegen.
  - Abnahme: sauberer Checkout besteht Rust- und Web-Prüfungen.
- [ ] **M0-06 Third-Party- und Header-Prozess vorbereiten.**
  - Konkrete Lizenz erst nach P0-04 einsetzen.
  - Abnahme: Abhängigkeiten und Modelle können reproduzierbar inventarisiert werden.

**Gate M0:** Ein frischer Checkout baut Rust, WASM und Web; die Seite zeigt die Engine-Version.

## M1 — Konfiguration und Engine-Vertrag

- [ ] **M1-01 Kanonisches Optionsmodell definieren.**
  - Defaults, Bereiche, Enums, Formerkennung und Reststrategie abbilden.
  - Abnahme: gültige und ungültige Grenzwerte sind getestet.
- [ ] **M1-02 TypeScript-Vertrag aus dem Optionsmodell ableiten.**
  - Drift zwischen Rust und TypeScript durch Generierung oder Vertragstests verhindern.
  - Abnahme: Defaults und Feldnamen sind auf beiden Seiten identisch.
- [ ] **M1-03 `ConversionResult` und öffentliche Fehler definieren.**
  - SVG, Statistiken, Warnungen und stabile Fehlercodes.
  - Abnahme: JS erhält strukturierte Resultate und verständliche Fehlermeldungen.
- [ ] **M1-04 RGBA-Eingaben streng validieren.**
  - Dimensionen, Überläufe und `width × height × 4` prüfen.
  - Abnahme: beschädigte Eingaben führen kontrolliert zum Fehler, nicht zum Panic.
- [ ] **M1-05 Determinismus-Grundregeln testen.**
  - Kanonische Zahlen, Reihenfolgen und Serialisierung.
  - Abnahme: zwei identische synthetische Runs liefern identische Bytes.

**Gate M1:** Die Engine besitzt einen stabilen, validierten WASM-Vertrag ohne echte
Vektorisierungslücken in der API.

## M2 — Robuste Pfad-Vektorisierung

- [ ] **M2-01 `visioncortex`-Version und API verifizieren und pinnen.**
  - Lizenz, WASM-Kompatibilität und benötigte Funktionen dokumentieren.
  - Abnahme: kleiner Adaptertest läuft nativ und für WASM.
- [ ] **M2-02 Farb- und Alpha-Vorbereitung implementieren.**
  - Transparenz vor RGB-Verlust erkennen; stabile Farbrepräsentation.
  - Abnahme: transparente und teiltransparente Fixtures behalten erwartete Alpha-Werte.
- [ ] **M2-03 Hierarchisches Clustering anbinden.**
  - `stacked` und `cutout`, Filter, Farbschritte und stabile Z-Reihenfolge.
  - Abnahme: beide Modi erzeugen deterministische, visuell plausible Cluster.
- [ ] **M2-04 Compound-Path-Tracing anbinden.**
  - Corner, Splice, Segmentlänge und Kurvenmodus korrekt übersetzen.
  - Abnahme: Außenkonturen und Löcher werden korrekt serialisiert.
- [ ] **M2-05 Interne Pfadrepräsentation und Parser implementieren.**
  - Unterstützte SVG-Kommandos und Parserfehler vollständig testen.
  - Abnahme: Roundtrip-Fixtures verlieren keine Geometrie.
- [ ] **M2-06 Offset- und Transform-Optimierung implementieren.**
  - Translation in Koordinaten einrechnen.
  - Abnahme: Testpfade benötigen kein redundantes `transform`.
- [ ] **M2-07 Relative Kommandos sowie H/V-Auswahl implementieren.**
  - Jeweils die kürzere kanonische Darstellung wählen.
  - Abnahme: Golden-Tests decken positive und negative Koordinaten ab.
- [ ] **M2-08 Präzision und Zahlformatierung implementieren.**
  - Rundung, `-0`, führende und nachgestellte Nullen behandeln.
  - Abnahme: alle Präzisionsstufen 0–6 besitzen Grenzwerttests.
- [ ] **M2-09 Deterministische SVG-Assembly implementieren.**
  - Attribute, Farben, Whitespace und Escaping kanonisieren.
  - Abnahme: SVG ist valide, renderbar und byte-stabil.
- [ ] **M2-10 Engine-Statistiken berechnen.**
  - Pfade, Punkte, Farben, Alpha und Optimizer-Ersparnis ohne UI-Regex.
  - Abnahme: Statistiken stimmen mit bekannten Fixtures überein.
- [ ] **M2-11 Visuellen Integrationsvergleich aufbauen.**
  - SVG über `resvg`/`tiny-skia` rendern und gegen Input vergleichen.
  - Abnahme: dokumentierte Fehlerschwellen für Logo, Icon, Illustration und Foto.
- [ ] **M2-12 Optimizer-Nutzen belegen.**
  - Optimierte und unoptimierte Ausgabe desselben Runs vergleichen.
  - Abnahme: Bericht zeigt Größe und visuelle Gleichheit.

**Gate M2:** Ein RGBA-Bild wird lokal in ein valides, deterministisches und getestetes SVG
mit optimierten Pfaden konvertiert.

## M3 — Optionale native Formen

- [ ] **M3-01 Gemeinsames Kontur- und Erkennungsergebnis modellieren.**
  - Konfidenz, Geometrie, Farbe, Alpha und Z-Reihenfolge.
- [ ] **M3-02 Kreisdetektor implementieren und testen.**
- [ ] **M3-03 Ellipsendetektor implementieren und testen.**
- [ ] **M3-04 Rechteckdetektor einschließlich Rotation implementieren und testen.**
- [ ] **M3-05 Liniendetektor implementieren und testen.**
- [ ] **M3-06 Polygonerkennung mit Douglas-Peucker implementieren und testen.**
- [ ] **M3-07 Selektive Detektor-Kette integrieren.**
  - Nur aktivierte Typen ausführen; eindeutige Priorität und stabile Ergebnisse.
- [ ] **M3-08 Reststrategie `path` implementieren.**
  - Abnahme: Freiform bleibt vollständig als Pfad erhalten.
- [ ] **M3-09 Reststrategien `ignore` und `raster` implementieren.**
  - Hybrid-Ausgabe eindeutig markieren und korrekt einbetten.
- [ ] **M3-10 Native SVG-Assembly und Shape-Statistiken ergänzen.**
  - Abnahme: synthetische Fixtures enthalten erwartete native Tags.
- [ ] **M3-11 Falsch-positive Erkennung messen.**
  - Schwellen anhand gemischter Fixtures dokumentieren und Defaults begründen.

**Gate M3:** Jeder Formtyp kann einzeln aktiviert werden; Freiformen und unsichere Treffer
verwenden zuverlässig die gewählte Reststrategie.

## M4 — Basis-Webanwendung und Export

- [ ] **M4-01 Zentralen App-Zustand und Services implementieren.**
  - Keine doppelte Zustandsquelle zwischen UI und späterem WebMCP.
- [ ] **M4-02 Datei- und Drag-and-Drop-Import implementieren.**
  - Browserfähigkeiten erkennen; Format- und Größenfehler erklären.
- [ ] **M4-03 Unveränderliches Original und Transformationen implementieren.**
  - Drehen, Spiegeln und Reset.
- [ ] **M4-04 Größenmodell implementieren.**
  - Unverändert, Prozent, eigene Maße, Icons, HD/FHD/QHD/UHD.
  - Abnahme: Seitenverhältnis und tatsächliche Pixelmaße sind korrekt.
- [ ] **M4-05 WASM-Konvertierung in einen Worker verlagern.**
  - Fortschritt/Busy, Fehler und Abbruch behandeln; WASM-Ressourcen freigeben.
- [ ] **M4-06 Parametersteuerung aus kanonischen Metadaten rendern.**
  - Formerkennung und Reststrategie verständlich erklären.
- [ ] **M4-07 Built-in- und eigene Presets implementieren.**
  - Manuelle Änderung setzt „Benutzerdefiniert“; Persistenz ohne große Run-Daten.
- [ ] **M4-08 Canvas/SVG-Anzeige mit Zoom, Pan, Fit und 1:1 implementieren.**
- [ ] **M4-09 View-Tabs für SVG, verarbeitetes Bild und Original implementieren.**
- [ ] **M4-10 Footer-Statistiken und transparente Warnungen implementieren.**
- [ ] **M4-11 SVG-, PNG- und WebP-Export implementieren.**
  - Browserfähigkeiten und Qualitätsparameter beachten.
- [ ] **M4-12 SVG-Code kopieren und sichere Dateinamen implementieren.**
- [ ] **M4-13 Basis-Fehlerzustände und responsive Bedienung testen.**

**Gate M4:** Ein Nutzer kann ein Bild laden, konfigurieren, konvertieren, prüfen und in den
Pflichtformaten exportieren.

## M5 — History und A/B-Vergleich

- [ ] **M5-01 Unveränderliches Run-Modell und maximale History implementieren.**
- [ ] **M5-02 Thumbnails und Run-Karten implementieren.**
- [ ] **M5-03 Einstellungen eines Runs vollständig wiederherstellen.**
  - Abnahme: erneuter Run ist bei unverändertem Input byte-identisch.
- [ ] **M5-04 A/B-Auswahl einschließlich Original implementieren.**
- [ ] **M5-05 Overlay-Slider über den vollen Bereich 0–100 % implementieren.**
- [ ] **M5-06 Synchronen Zoom und Pan implementieren.**
- [ ] **M5-07 Gecachte Lupe mit korrekter A/B-Grenze implementieren.**
- [ ] **M5-08 Parameter-Diff aus kanonischem Schema implementieren.**
  - Gleiche Werte und nur Unterschiede umschaltbar.
- [ ] **M5-09 A/B-Infokarten und Exporte implementieren.**
- [ ] **M5-10 Auto-A-Verhalten nach neuem Run festlegen und testen.**
- [ ] **M5-11 Browser-End-to-End-Test für den Kernvergleich erstellen.**
  - Abnahme: Änderung genau eines Parameters erscheint genau einmal im Diff.

**Gate M5:** Zwei Runs lassen sich visuell und parametrisch zuverlässig vergleichen; ihre
Einstellungen und Dateien sind direkt erreichbar.

## M6 — Nicht destruktive Vorverarbeitung und KI

- [ ] **M6-01 Preprocessing-Pipeline und Versionierung der Eingaben implementieren.**
- [ ] **M6-02 Helligkeit, Kontrast, Blur und Threshold implementieren.**
- [ ] **M6-03 Bilaterales Denoise implementieren und performance-testen.**
- [ ] **M6-04 Konventionelles 2×/4×/8×-Upscaling integrieren.**
- [ ] **M6-05 Aktuelle Transformers.js-Version und Modelle erneut lizenzprüfen und pinnen.**
  - **BLOCKER** für Modellintegration, nicht für M0–M5.
- [ ] **M6-06 Zentrale Modell-Registry als Zustandsautomat implementieren.**
  - Promise-Deduplizierung, Retry, echter Fortschritt, Backend-Anzeige und Dispose.
- [ ] **M6-07 Cache- und Speicheranzeige robust implementieren.**
- [ ] **M6-08 MODNet-Hintergrundentfernung implementieren.**
  - Threshold und Edge-Sharpness; Alpha-Ränder testen.
- [ ] **M6-09 SAM-Modell laden und Embeddings cachen.**
- [ ] **M6-10 Smart-Select-UI mit positiven/negativen Punkten implementieren.**
- [ ] **M6-11 Maske invertieren, löschen, anwenden und beenden implementieren.**
- [ ] **M6-12 KI-Ergebnisse als neue nicht destruktive Eingaben historisieren.**
- [ ] **M6-13 Optionalen KI-Upscaler bewerten.**
  - Nur aufnehmen, wenn Lizenz, Modellgröße und Demo-Nutzen überzeugen.

**Gate M6:** Modellzustände können nicht hängen; BG-Remove und Mehrpunkt-SAM funktionieren
lokal mit sichtbarem Backend und nachvollziehbaren Fehlern.

## M7 — WebMCP-Steuerung

- [ ] **M7-01 Aktuellen WebMCP-Entwurf und Ziel-Chrome erneut verifizieren.**
  - `document.modelContext`, Flags/Origin-Trial und Sicherheitsanforderungen dokumentieren.
- [ ] **M7-02 Tool-Strategie und versionierte Schemas festschreiben.**
  - Fähigkeiten, Zustand, Konfiguration, Run, Vergleich, Restore und Export.
- [ ] **M7-03 WebMCP-Adapter mit Feature Detection implementieren.**
  - Ohne API keine Fehler und keine Einschränkung der normalen UI.
- [ ] **M7-04 Nur lesende Tools implementieren.**
  - `get_capabilities`, `get_state`, `list_runs`.
- [ ] **M7-05 Konfigurations- und Konvertierungstools implementieren.**
  - Dieselben Validatoren und Services wie die UI verwenden.
- [ ] **M7-06 Vergleichs- und Restore-Tools implementieren.**
  - Strukturierte Diffs zurückgeben und sichtbare UI aktualisieren.
- [ ] **M7-07 Export-Tool mit klaren Seiteneffekten implementieren.**
  - Nur vorhandene Runs; Format- und Browserfehler strukturiert melden.
- [ ] **M7-08 Tool-Sicherheit und Prompt-Injection-Grenzen testen.**
  - Keine Bildtexte oder Dateimetadaten in Tool-Beschreibungen übernehmen.
  - Eingaben begrenzen und Outputs als potenziell nicht vertrauenswürdig markieren.
- [ ] **M7-09 UI-/Tool-Zustandssynchronität testen.**
  - Menschliche und agentische Änderungen erscheinen sofort auf beiden Wegen.
- [ ] **M7-10 Agentischen End-to-End-Ablauf testen.**
  - Agent wählt lokal erzeugtes Bild im sichtbaren Browser aus.
  - Agent setzt Preset/Größe, erzeugt zwei Runs, vergleicht und exportiert SVG.
- [ ] **M7-11 WebMCP-Demo-Fallback dokumentieren.**
  - Falls Zielbrowser die API nicht bereitstellt, bleibt UI-Aktuierung nachvollziehbar.

**Gate M7:** Ein unterstützter Browser-Agent kann den sichtbaren Kernablauf zuverlässig über
strukturierte Tools steuern; die normale Anwendung bleibt unabhängig davon vollständig.

## M8 — Politur, Rechtliches und Einreichung

- [ ] **M8-01 Lizenzentscheidung P0-04 umsetzen.**
  - `LICENSE.md`, Quellheader, README und UI-Footer.
- [ ] **M8-02 `THIRD_PARTY_LICENSES.md` vollständig erzeugen und prüfen.**
  - Rust, JavaScript, Modelle und adaptierte Algorithmen.
- [ ] **M8-03 Datenschutz- und Netzwerkverhalten dokumentieren und testen.**
- [ ] **M8-04 Lizenzfreie Beispielbilder und Golden-Fixtures hinzufügen.**
- [ ] **M8-05 Tastatur, Screenreader-Grundlagen und Kontrast prüfen.**
- [ ] **M8-06 Große und beschädigte Eingaben, Speichergrenzen und Abbruch testen.**
- [ ] **M8-07 Performance-Budgets messen und dokumentieren.**
  - WASM-Größe, Startzeit, Konvertierungszeit, Lupe und Modellbedarf.
- [ ] **M8-08 Statisches Deployment mit Sicherheitsheadern einrichten.**
- [ ] **M8-09 README mit Build, Architektur, Screenshots und Grenzen fertigstellen.**
- [ ] **M8-10 Demo-Drehbuch automatisiert und manuell proben.**
- [ ] **M8-11 Release-Checkliste und reproduzierbaren Tag erstellen.**

**Gate M8 / Definition of Done:** Alle vorherigen Gates sind erfüllt, die Lizenz ist geklärt,
ein frischer Checkout baut reproduzierbar und der vollständige Demo-Ablauf funktioniert ohne
manuelle Reparaturschritte.

## Kür nach Definition of Done

- [ ] **K-01 Run-Matrix für einen variierten Parameter.**
- [ ] **K-02 Preset-Import und -Export.**
- [ ] **K-03 Einstellungen als URL-Permalink ohne Bilddaten.**
- [ ] **K-04 Experimentelle Gradientenerkennung.**
- [ ] **K-05 Zusätzliche Browser-Rasterformate.**
- [ ] **K-06 KI-Upscaling mit geprüftem Modell.**
