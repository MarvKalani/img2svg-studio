# Umsetzungsliste

## Arbeitsweise

Die verbindlichen Qualitätsregeln stehen in
[`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md). Für jeden Task gilt:

- als kleinster sinnvoller vertikaler Slice umsetzen.
- Verhalten zuerst mit dem schnellsten aussagekräftigen Test beschreiben.
- lösungsorientiert die beste reversible Annahme wählen und den Slice bis zur Abnahme bringen.
- in der Reihenfolge „make it work, make it right, make it fast“ arbeiten.
- nur den aktuellen Slice implementieren; keine vorgezogenen Erweiterungen.
- EVA-Grenzen und typisierte Domänenwerte verwenden.
- nur notwendige Git-Diffs erzeugen und fremde Änderungen unangetastet lassen.
- keine handgeschriebene Quell- oder Testdatei mit mehr als 1000 Zeilen zulassen.
- relevante schnelle Checks vor jedem Commit, vollständige Checks an jedem Gate ausführen.
- genau einen verständlichen Commit pro abgeschlossenem Slice mit Task-ID im Betreff erstellen.

## Statuslegende

- `[ ]` offen
- `[x]` abgeschlossen
- **BLOCKER** verlangt eine Entscheidung, bevor der genannte Folgeschritt abgeschlossen wird.

## P0 — Verbindliche Projektbasis

- [x] **P0-01 Projektbrief konsolidieren.**
  - Abnahme: Problem, Lösung, Ziele, Nicht-Ziele und Demo sind dokumentiert.
- [x] **P0-02 Produkt- und Technikgrundlage konsolidieren.**
  - Abnahme: spätere Entscheidungen ersetzen widersprüchliche Ausgangspunkte sichtbar.
- [x] **P0-03 Vertikal geschnittene Taskliste anlegen.**
  - Abnahme: jeder Implementierungstask liefert ein prüfbares Ende-zu-Ende-Verhalten.
- [ ] **P0-04 Hackathon-Regeln und Projektlizenz bestätigen — BLOCKER für Release.**
  - Entscheidung in D-009 dokumentieren.
  - Abnahme: `LICENSE.md`, README, UI-Footer und Quellheader sind widerspruchsfrei.
- [x] **P0-05 Engineering-Standards festschreiben.**
  - Abnahme: KISS, SINE, EVA, TDD, minimale Diffs und Dateilimit sind verbindlich.
- [x] **P0-06 TypeScript-Version entscheiden.**
  - Abnahme: TypeScript 7.0.2 ist als stabile, exakt zu pinnende Version dokumentiert.
- [x] **P0-07 Offizielle Build-Week-Anforderungen prüfen.**
  - Abnahme: Frist, Pflichtmaterialien, Codex-Nachweis und Testzugang sind dokumentiert.

## OpenAI Build Week — kritischer Pfad

Deadline: **22. Juli 2026, 02:00 CEST**. Diese Liste priorisiert die Submission; die
vollständige Roadmap darunter bleibt bestehen.

- [ ] **BW-01 Devpost-Teilnahme bestätigen — Aktion des Projekteigners.**
  - Devpost-Konto, „Join Hackathon“ und Teilnahmeberechtigung prüfen.
- [ ] **BW-02 GitHub-Repository, Sichtbarkeit und Lizenz festlegen.**
  - Abnahme: Remote ist gesetzt, `main` gepusht und der Zugriff für Judges geklärt.
- [ ] **BW-03 M0-Gate vollständig erreichen.**
- [ ] **BW-04 Sichtbaren Converter-Kern liefern.**
  - Bild laden, minimal real konvertieren, SVG anzeigen und herunterladen.
  - Layout: Parameter links, Arbeitsfläche mittig, zunächst leere History unten.
- [ ] **BW-05 History unten funktionsfähig machen.**
  - Mehrere Runs zeigen, auswählen und wieder anzeigen; maximal notwendige Metadaten.
- [ ] **BW-06 A/B und Parameter-Diff liefern.**
  - Zwei History-Runs umschalten, visuell vergleichen und nur echte Unterschiede markieren.
- [ ] **BW-07 Wenige echte Parameter links durchstechen.**
  - Kanonische Defaults plus zwei oder drei demo-relevante Regler statt vollständigem Katalog.
- [ ] **BW-08 KI-Manager mit MODNet liefern.**
  - Ein Registry-Zustandsautomat, echter Fortschritt, Retry, Backend-Anzeige und Dispose.
  - Modell nur auf Nutzeraktion laden und nach Entladen Ressourcen freigeben.
- [ ] **BW-09 WebMCP-Kern liefern.**
  - M7-01, M7-02, M7-04 und M7-05 mit sichtbarer UI-Synchronität.
- [ ] **BW-10 Öffentliche statische Demo bereitstellen.**
  - Abnahme: funktioniert kostenlos und ohne Login in einem frischen Browser.
- [ ] **BW-11 Englische Submission-Unterlagen fertigstellen.**
  - README, Projektbeschreibung, Testanleitung, Codex-/GPT-5.6-Nachweis und Lizenzen.
- [ ] **BW-12 Demovideo unter drei Minuten veröffentlichen — gemeinsame Aktion.**
  - Öffentliches YouTube-Video mit englischem Audio oder vollständiger Übersetzung.
- [ ] **BW-13 `/feedback` Session ID und Devpost-Submission absenden — gemeinsame Aktion.**
  - Alle Links unangemeldet testen; mehrere Stunden Puffer vor der Frist behalten.

## M0 — Gerüst und erster vertikaler System-Slice

- [ ] **M0-01 Minimalen Workspace anlegen.**
  - Rust-Crates `img2svg-core` und `img2svg-wasm` sowie `web` mit Vite anlegen.
  - `img2svg-cli` erst mit seinem ersten nutzbaren Slice ergänzen.
  - TypeScript exakt als `7.0.2` ohne Versionsbereich pinnen.
  - Abnahme: leere Rust- und Web-Builds laufen mit committed Lockfiles.
- [ ] **M0-02 Schnellste Testschleifen einrichten.**
  - Rust-Unit-Test und TypeScript-Unit-Test mit kleinen gezielten Befehlen ermöglichen.
  - Abnahme: beide einzelnen Testzyklen starten lokal in wenigen Sekunden.
- [ ] **M0-03 Engine-Version Ende zu Ende anzeigen.**
  - Test zuerst: Rust-Version → WASM-Binding → TypeScript-Service → sichtbarer UI-Status.
  - Nur die für diesen Weg nötige Struktur erzeugen.
  - Abnahme: Browser zeigt die echte Engine-Version; Vertrags- und UI-Test sind grün.
- [ ] **M0-04 Lokale Qualitätsgates hinzufügen.**
  - Formatierung, Clippy, Typecheck, Lint, schnelle Tests und 1000-Zeilen-Prüfung.
  - Abnahme: ein kurzer `check`-Befehl schlägt bei Warnung oder zu großer Quelldatei fehl.
- [ ] **M0-05 CI für denselben reproduzierbaren Check einrichten.**
  - Keine Deployment-Schritte oder Secrets.
  - Abnahme: frischer Checkout besteht exakt die lokal dokumentierten Prüfungen.

**Gate M0:** Rust, WASM und Web bauen reproduzierbar. Der Browser zeigt die Rust-Version.
Alle schnellen Qualitätsgates sind grün.

## M1 — Erstes wirklich nutzbares SVG

- [ ] **M1-01 Bild laden und unverändert anzeigen.**
  - PNG, JPEG und WebP über Browser-Decoding in typisiertes RGBA überführen.
  - Fehlerhafte und nicht unterstützte Dateien sichtbar ablehnen.
  - Abnahme: Drop und Dateiwahl zeigen dasselbe Testbild mit korrekten Maßen.
- [ ] **M1-02 Default-Konvertierung Ende zu Ende liefern.**
  - Test zuerst: bekanntes RGBA-Fixture erzeugt deterministisches, valides SVG.
  - Minimalen `visioncortex`-Adapter, WASM-Aufruf, Konvertieren-Button und SVG-Ansicht bauen.
  - Abnahme: ein geladenes Fixture wird im Browser sichtbar als SVG gerendert.
- [ ] **M1-03 SVG herunterladen.**
  - Export-Service erst für den aktuellen Run und SVG implementieren.
  - Abnahme: Download entspricht bytegenau dem angezeigten SVG.
- [ ] **M1-04 Fehler vom Rust-Core bis in die UI führen.**
  - Ungültige Maße, RGBA-Länge und Enginefehler typisieren.
  - Abnahme: kein Panic; UI zeigt verständliche Meldung und bleibt bedienbar.
- [ ] **M1-05 Transparenz Ende zu Ende erhalten.**
  - Testfixture mit transparenten und teiltransparenten Pixeln verwenden.
  - Abnahme: Ergebnis rendert erwartetes Alpha und zeigt ein Alpha-Badge.
- [ ] **M1-06 Determinismus als Systemtest sichern.**
  - Abnahme: zwei Browser-/WASM-Runs mit gleichem Input liefern identische SVG-Bytes.

**Gate M1:** Ein Nutzer lädt ein Bild, konvertiert es lokal, sieht das SVG und lädt exakt
dieses Ergebnis herunter.

## M2 — Qualität kontrollierbar machen

Jeder Parameter-Slice reicht vom typisierten Optionswert über WASM und Engine bis zur
sichtbaren UI und enthält mindestens einen Wirkungs- oder Grenzwerttest.

- [ ] **M2-01 Kanonisches Optionsmodell und Defaults einführen.**
  - Eine Quelle speist Rust-Validierung, TypeScript, UI-Metadaten und spätere Diffs.
  - Abnahme: Defaults und Feldnamen können nicht unbemerkt auseinanderlaufen.
- [ ] **M2-02 Farbpräzision und Speckle-Filter durchstechen.**
  - Abnahme: zwei definierte Werte erzeugen nachvollziehbar unterschiedliche Resultate.
- [ ] **M2-03 `stacked` und `cutout` durchstechen.**
  - Abnahme: Z-Reihenfolge, Löcher und Moduswechsel sind durch Fixtures getestet.
- [ ] **M2-04 Kurvenparameter durchstechen.**
  - Corner, Splice, Segmentlänge und Kurven an/aus typisiert anbieten.
  - Abnahme: Pixel-Art- und Kurven-Fixtures reagieren erwartungsgemäß.
- [ ] **M2-05 Path-Offset ohne `transform` optimieren.**
  - Parser und Offset erst mit kleinen Rust-Tests entwickeln.
  - Abnahme: gerenderte Geometrie bleibt gleich; redundantes `transform` entfällt.
- [ ] **M2-06 Präzision und Zahlenformatierung durchstechen.**
  - 0–6 Stellen, Rundung, `-0` und Nullen kanonisch behandeln.
  - Abnahme: Golden-Tests und UI-Auswahl sind grün.
- [ ] **M2-07 Relative Kommandos und H/V durchstechen.**
  - Abnahme: Engine wählt deterministisch die kürzere valide Darstellung.
- [ ] **M2-08 Optimizer an/aus mit echter Ersparnis anzeigen.**
  - Stats aus der Engine, keine Regex-Auswertung im UI.
  - Abnahme: Footer zeigt Bytevergleich bei visuell identischem Ergebnis.
- [ ] **M2-09 Visuelle Qualitätsfixtures integrieren.**
  - Logo, Icon, Illustration und Foto über `resvg`/`tiny-skia` prüfen.
  - Abnahme: dokumentierte Fehlerschwellen und deterministische Golden-Artefakte.

**Gate M2:** Die Kernparameter wirken sichtbar und getestet. Der Optimizer ist messbar, kann
abgeschaltet werden und verändert die gerenderte Geometrie nicht unzulässig.

## M3 — Größen, Presets und zusätzliche Ausgaben

- [ ] **M3-01 Drehen und Spiegeln als nicht destruktiven Slice liefern.**
  - Abnahme: Original bleibt erhalten; Konvertierung nutzt sichtbar transformierte RGBA-Daten.
- [ ] **M3-02 Prozentuale Größenänderung durchstechen.**
  - Typisierte Prozentwerte und sichtbare Zielmaße.
  - Abnahme: Down- und Upscale behalten standardmäßig das Seitenverhältnis.
- [ ] **M3-03 Eigene Maße und Größenpresets durchstechen.**
  - Icons sowie HD, FHD, QHD und UHD.
  - Abnahme: UI, tatsächliche Canvasmaße und Run-Statistik stimmen überein.
- [ ] **M3-04 Built-in-Presets Ende zu Ende liefern.**
  - Icon, Logo, Illustration, Photo und Pixel Art mit exakt dokumentierten Werten.
  - Abnahme: manuelle Änderung schaltet sichtbar auf „Benutzerdefiniert“.
- [ ] **M3-05 Eigene Presets lokal speichern und löschen.**
  - Nur Settings, keine großen Bild- oder Run-Daten in `localStorage`.
  - Abnahme: Reload erhält das Preset und validiert importierte Werte.
- [ ] **M3-06 PNG-Export aus einem Run liefern.**
  - Abnahme: gerasterte Maße und Alpha stimmen mit der Auswahl überein.
- [ ] **M3-07 WebP-Export mit Qualitätssteuerung liefern.**
  - Abnahme: Browserfähigkeit wird erkannt; fehlende Unterstützung wird erklärt.
- [ ] **M3-08 Ersten CLI-Slice ergänzen.**
  - Ein Input, ein Output und Default-Konvertierung über dieselbe Core-API.
  - Abnahme: CLI- und WASM-Default erzeugen semantisch identische SVGs.

**Gate M3:** Größe, Preset und Export sind nachvollziehbar; Web und CLI verwenden dieselbe
Engine ohne duplizierte Konvertierungslogik.

## M4 — Native Formen als optionale vertikale Slices

- [ ] **M4-01 Formerkennungsrahmen mit sicherem Pfad-Fallback liefern.**
  - Globaler Schalter, aktivierte Typen und `remainder_strategy=path` typisieren.
  - Abnahme: ausgeschaltete Erkennung ist byteidentisch zur bisherigen Ausgabe.
- [ ] **M4-02 Kreise Ende zu Ende erkennen.**
  - Synthetisches Fixture, Schwellwert, UI-Schalter, `<circle>` und Statistik.
- [ ] **M4-03 Rechtecke einschließlich Rotation Ende zu Ende erkennen.**
  - Abnahme: Rechteckfixture wird nativ; Freiform bleibt Pfad.
- [ ] **M4-04 Ellipsen Ende zu Ende erkennen.**
  - Abnahme: Kreis und Ellipse werden bei Grenzfällen stabil unterschieden.
- [ ] **M4-05 Linien Ende zu Ende erkennen.**
  - Abnahme: Seitenverhältnis wirkt sichtbar und ist validiert.
- [ ] **M4-06 Polygone Ende zu Ende erkennen.**
  - Douglas-Peucker-Epsilon typisiert durchreichen.
  - Abnahme: Dreieck wird nativ; komplexe Freiform fällt zurück.
- [ ] **M4-07 Selektive Detektorkette und Priorität absichern.**
  - Abnahme: nur aktivierte Typen laufen; gemischte Fixtures bleiben deterministisch.
- [ ] **M4-08 Reststrategie `ignore` liefern.**
  - Deutliche UI-Warnung; Abnahme: nur bewusst nicht erkannte Inhalte fehlen.
- [ ] **M4-09 Reststrategie `raster` als Hybrid-SVG liefern.**
  - Abnahme: Ausgabe ist korrekt eingebettet und sichtbar als Hybrid gekennzeichnet.
- [ ] **M4-10 Falsch-positive Erkennung messen und Defaults festlegen.**
  - Abnahme: dokumentierter Fixture-Satz begründet die Standardschwellen.

**Gate M4:** Jeder Formtyp ist einzeln steuerbar und sichtbar getestet. Der sichere Default
bleibt Pfad; Hybrid- und Ignore-Ausgaben sind unmissverständlich.

## M5 — History und A/B-Vergleich

- [ ] **M5-01 Ersten Run unveränderlich in der History zeigen.**
  - Settings, Statistik, Thumbnail, Run-ID und Zeitstempel.
  - Abnahme: maximal zehn Einträge, ohne große Binärdaten in `localStorage`.
- [ ] **M5-02 Einstellungen eines Runs wiederherstellen.**
  - Abnahme: Restore und erneuter Run liefern bei gleichem Input identische SVG-Bytes.
- [ ] **M5-03 Zwei Runs oder Original als A und B wählen.**
  - Abnahme: Auswahl ist sichtbar, stabil und tastaturbedienbar.
- [ ] **M5-04 Overlay-Slider über 0–100 Prozent liefern.**
  - Abnahme: beide Grenzen und die Mitte zeigen korrekte, deckungsgleiche Inhalte.
- [ ] **M5-05 Parameter-Diff durchstechen.**
  - Kanonisches Schema verwenden; gleiche Werte und „nur Unterschiede“ anbieten.
  - Abnahme: Änderung eines Parameters erscheint genau einmal.
- [ ] **M5-06 A/B-Infokarten und Downloads liefern.**
  - Abnahme: jede Seite exportiert den tatsächlich ausgewählten Run.
- [ ] **M5-07 Synchronen Zoom und Pan liefern.**
  - Abnahme: A und B verlieren bei Transformationen nicht ihre Deckung.
- [ ] **M5-08 Gecachte Lupe liefern.**
  - Abnahme: Seite und Beschriftung wechseln an der Slider-Grenze korrekt.
- [ ] **M5-09 Auto-A nach einem neuen Run liefern.**
  - Abnahme: bestehende Auswahl verschiebt sich deterministisch und verständlich.
- [ ] **M5-10 Kritischen Browser-End-to-End-Test sichern.**
  - Bild laden, zwei Runs erzeugen, einen Parameter vergleichen und beide exportieren.

**Gate M5:** Der Vergleichsworkflow ist vollständig nutzbar und erklärt visuell wie
parametrisch, warum sich zwei Ergebnisse unterscheiden.

## M6 — Nicht destruktive Vorverarbeitung und KI

- [ ] **M6-01 Helligkeit als ersten Preprocessing-Slice liefern.**
  - Versionierte Eingabe, Vorschau, Anwenden und Reset; Original bleibt unverändert.
- [ ] **M6-02 Kontrast, Blur und Threshold einzeln durchstechen.**
  - Jeder Effekt beginnt mit einem kleinen Pixeltest.
- [ ] **M6-03 Bilaterales Denoise liefern.**
  - Abnahme: messbarer Effekt und akzeptable Laufzeit auf einem definierten Fixture.
- [ ] **M6-04 Konventionelles 2×/4×/8×-Upscaling liefern.**
  - Abnahme: Interpolation, tatsächliche Maße und Speichern in der Eingabe-History stimmen.
- [ ] **M6-05 Transformers.js und Modelle aktuell prüfen — BLOCKER für KI-Slices.**
  - Versionen, Revisionen, Lizenzen, Größe und kommerzielle Nutzbarkeit dokumentieren.
- [ ] **M6-06 Modell-Registry zuerst mit einem Fake-Loader liefern.**
  - Zustände, Promise-Deduplizierung, Retry, Fortschritt und Dispose testgetrieben entwickeln.
- [ ] **M6-07 MODNet-Hintergrundentfernung durchstechen.**
  - Backend und echter Fortschritt sichtbar; Threshold und Edge-Sharpness.
  - Abnahme: Alpha-Ränder erfüllen definierte Fixture-Erwartungen.
- [ ] **M6-08 Cache- und Speicherverwaltung liefern.**
  - Abnahme: Operationen werden awaited, rückgemeldet und hängen nie im Ladezustand.
- [ ] **M6-09 SAM mit einem positiven Punkt durchstechen.**
  - Modell, Embedding, sichtbarer Marker, Maske und Anwenden Ende zu Ende.
- [ ] **M6-10 Positive und negative Mehrfachpunkte liefern.**
  - Abnahme: mindestens zwei positive und ein negativer Punkt verfeinern die Maske.
- [ ] **M6-11 Invertieren, Löschen und Beenden liefern.**
  - Abnahme: Modell- und Maskenzustand bleiben konsistent und Ressourcen werden freigegeben.
- [ ] **M6-12 KI-Ergebnisse in den normalen Run-Workflow integrieren.**
  - Abnahme: freigestelltes Objekt wird konvertiert, verglichen und exportiert.

**Gate M6:** Vorverarbeitung ist nicht destruktiv. Modellzustände können nicht hängen;
BG-Remove und Mehrpunkt-SAM funktionieren lokal mit ehrlichem Status.

## M7 — WebMCP-Steuerung als progressive Slices

- [ ] **M7-01 Aktuellen WebMCP-Entwurf und Ziel-Chrome erneut verifizieren.**
  - `document.modelContext`, Aktivierung und Sicherheit mit Primärquellen dokumentieren.
- [ ] **M7-02 `get_capabilities` als ersten Tool-Slice liefern.**
  - Feature Detection, enge Schemaantwort und kein Fehler ohne WebMCP-Unterstützung.
- [ ] **M7-03 `get_state` und `list_runs` liefern.**
  - Nur lesen; sichtbarer UI-Zustand bleibt einzige Quelle der Wahrheit.
- [ ] **M7-04 `configure_conversion` durchstechen.**
  - Dieselben typisierten Validatoren wie die UI; sichtbare UI aktualisiert sich sofort.
- [ ] **M7-05 `convert_current_image` durchstechen.**
  - Abnahme: Agenten-Run erscheint wie ein menschlicher Run in UI und History.
- [ ] **M7-06 Vergleich und Restore durchstechen.**
  - `compare_runs` und `restore_run_settings` liefern strukturierte Diffs.
- [ ] **M7-07 `export_run` mit klarem Seiteneffekt liefern.**
  - Abnahme: nur existierende Runs und unterstützte Formate; Fehler strukturiert.
- [ ] **M7-08 Tool-Sicherheitsgrenzen testen.**
  - Keine Bildtexte oder Dateimetadaten in Beschreibungen; Eingaben strikt begrenzen.
- [ ] **M7-09 Mensch-/Agent-Zustandssynchronität Ende zu Ende testen.**
- [ ] **M7-10 Vollständige Agenten-Demo testen.**
  - Agent wählt ein lokal erzeugtes Bild sichtbar aus, konfiguriert zwei Runs, vergleicht und
    exportiert SVG.
- [ ] **M7-11 UI-Fallback ohne WebMCP dokumentieren und testen.**

**Gate M7:** Ein unterstützter Browser-Agent steuert den sichtbaren Kernworkflow zuverlässig.
Ohne WebMCP bleibt die Anwendung vollständig nutzbar.

## M8 — Politur, Rechtliches und Einreichung

- [ ] **M8-01 Lizenzentscheidung P0-04 umsetzen.**
  - `LICENSE.md`, Quellheader, README und UI-Footer in einem Lizenz-Slice.
- [ ] **M8-02 Drittanbieter-Lizenzen vollständig inventarisieren.**
  - Rust, JavaScript, Modelle und adaptierte Algorithmen.
- [ ] **M8-03 Datenschutz- und Netzwerkverhalten prüfen.**
  - Abnahme: keine unerwarteten Requests, Uploads, Telemetrie oder externen Fonts.
- [ ] **M8-04 Lizenzfreie Beispielbilder und Golden-Fixtures liefern.**
- [ ] **M8-05 Tastatur und Screenreader-Kernpfade prüfen.**
- [ ] **M8-06 Große, beschädigte und speicherintensive Eingaben absichern.**
- [ ] **M8-07 Performance-Budgets messen.**
  - WASM-Größe, Start, Konvertierung, A/B-Lupe und Modelle.
- [ ] **M8-08 Statisches Deployment mit Sicherheitsheadern liefern.**
- [ ] **M8-09 README mit Build, Architektur, Grenzen und Screenshots fertigstellen.**
- [ ] **M8-10 Demo-Drehbuch automatisiert und manuell proben.**
- [ ] **M8-11 Reproduzierbaren Release-Tag erstellen.**

**Gate M8 / Definition of Done:** Alle vorherigen Gates sind erfüllt. Ein frischer Checkout
baut reproduzierbar, alle Qualitätsprüfungen sind grün und die Demo läuft ohne Reparaturen.

## Kür nach Definition of Done

- [ ] **K-01 Run-Matrix für genau einen variierten Parameter.**
- [ ] **K-02 Preset-Import und -Export.**
- [ ] **K-03 Settings-Permalink ohne Bilddaten.**
- [ ] **K-04 Experimentelle Gradientenerkennung.**
- [ ] **K-05 Zusätzliche Browser-Rasterformate.**
- [ ] **K-06 KI-Upscaling mit geprüftem Modell.**
