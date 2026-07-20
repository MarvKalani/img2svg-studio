# Produktspezifikation — Submission-MVP

## 1. Verbindlicher Umfang

img2svg Studio ist eine statisch auslieferbare Single-Page-Anwendung. Sie konvertiert lokale
Rasterbilder in SVG, hält mehrere Ergebnisse im Verlauf, vergleicht zwei Varianten und kann
optionale Browser-KI sowie WebMCP explizit zuschalten.

`TASKS.md`, ausführbare Tests und Handbuch bilden gemeinsam den verbindlichen Umfang der
Build-Week-Einreichung.

Die UI ist vollständig auf Deutsch und Englisch bedienbar. Eine sichtbare Sprachauswahl ändert
statische und dynamische Texte ohne Neuladen und speichert ausschließlich die Sprachpräferenz
lokal. Code-Bezeichner sind englisch.

## 2. Eingaben und Datenschutz

- PNG, JPEG und WebP bis 25 MB werden über Browser-APIs dekodiert.
- Dateiauswahl und Drag-and-drop verwenden dieselbe validierte Decodergrenze.
- Das unveränderte Original bleibt für die gesamte Sitzung verfügbar.
- Beschädigte, zu große und nicht unterstützte Dateien erzeugen verständliche Fehler.
- Ein fehlgeschlagener neuer Ladevorgang erhält die letzte gültige Vorschau.
- Bildverarbeitung und Bilddaten bleiben im Browser.
- Die App verwendet lokale Fonts und verzichtet auf Telemetrie und Tracker.
- KI-Modellzugriffe beginnen nach sichtbarer Nutzeraktion.
- Das gebündelte Logo-Demo verwendet denselben Decoder, behält die Originalgröße und aktiviert das
  Logo-Preset; selbst gewählte oder geteilte Dateien verändern Einstellungen nicht.

## 3. Oberfläche

Der akzeptierte Entwurf besteht aus:

- Kopfzeile und Statusanzeige.
- linker Leiste für Bild, Zielgröße, wenige Konvertierungsparameter und KI-Manager.
- zentraler Arbeitsfläche für Original, SVG und deckungsgleichen A/B-Split.
- Parameter-Diff unter dem Vergleich.
- Session-History mit allen Runs des aktuellen Bildes und einer Löschaktion pro Run am unteren Rand.
- Fußbereich mit einer sichtbaren Version im Format `YYMMDD.RR`.
- direkt erreichbaren, zweisprachigen Seiten für Impressum, Datenschutz und Lizenzen.

Alle Kernaktionen sind tastaturbedienbar und zeigen ihren Lade-, Fehler- oder Leerzustand.
Die rechtlichen Seiten sind aus dem Fußbereich erreichbar, benötigen kein JavaScript für ihren
deutschen Inhalt und teilen bei aktiviertem JavaScript die lokale Sprachauswahl des Studios.

## 4. Konvertierung

### 4.1 Robuster Kern

Der Rust-Core erhält validierte RGBA-Bytes und verwendet eine fest gepinnte `visioncortex`-
Version für Clustering und Kontur-Tracing. Eine schmale `wasm-bindgen`-Grenze liefert ein
typisiertes `ConversionResult` an die Web-Anwendung.

Gleiche RGBA-Bytes und Einstellungen erzeugen byteidentische SVG-Ausgabe. Maße, Attribut- und
Elementreihenfolge sowie Zahlenformatierung sind nicht von Locale, Uhrzeit oder Hash-Reihenfolge
abhängig. Transparente Bildbereiche bleiben transparent.

### 4.2 Verbindliche Parameter

Das MVP trennt Rastervorbereitung vor dem Tracing von der SVG-Skalierung danach:

| Parameter | Bereich | Default | Bedeutung |
|---|---:|---:|---|
| Rastergröße | Original, 25/50/75/125/150/200/400 %, 576/720/1080/2160 px Höhe | Original | VTracer-Eingabepixel bei festem Seitenverhältnis |
| Rasterfilter | Farbe, Graustufen, Schwarzweiß | Farbe | lokale RGB-Vorbereitung vor VTracer |
| Detailfilter | Aus, Glätten, Schärfen | Aus | lokale Glättung oder Kantenverstärkung vor VTracer |
| Schwarzweiß-Schwellwert | 0–255 | 128 | Grenze zwischen Schwarz und Weiß |
| `color_precision` | 1–8 Bit/Kanal | 6 | Farbzusammenfassung |
| `filter_speckle` | 0–1000 px | 4 | kleine Segmente entfernen |
| `path_precision` | 0–4 Stellen | 2 | Koordinaten runden und SVG-Bytes reduzieren |
| `hierarchical` | Gestapelt, Ausschnitte | Gestapelt | überlagerte oder aneinanderliegende Farbflächen |
| `mode` | Pixel, Polygon, Spline | Spline | Art der Konturanpassung |
| `layer_difference` | 0–255 | 16 | Farbabstand zwischen Verlaufsebenen |
| `corner_threshold` | 0–180° | 60° | Mindestwinkel einer Spline-Ecke |
| `length_threshold` | 3,5–10 px | 4 px | maximale Segmentlänge beim Glätten |
| `max_iterations` | 1–20 | 10 | Begrenzung der Glättungsdurchläufe |
| `splice_threshold` | 0–180° | 45° | Winkel zum Trennen von Spline-Abschnitten |
| `scale_percent` | 10–400 % | 100 | proportionale SVG-Zielgröße nach dem Tracing |

Eine kanonische Definition speist TypeScript-Validierung, Rust/WASM-Vertrag, UI, Run-Snapshot,
Parameter-Diff und WebMCP. Prozent und Zielhöhe sind getrennte typisierte Größenmodi; die jeweils
andere Dimension wird aus dem Seitenverhältnis berechnet. Ungültige Werte werden abgelehnt und nie
still korrigiert.

### 4.3 Optionale native Formen

Die Formerkennung ist explizit zuschaltbar. Unterstützt werden Kreis, Rechteck, Ellipse, Linie
und Polygon. Formtypen können einzeln aktiviert werden. Jede übrige Kontur bleibt als Pfad
erhalten.

Die Ground-Truth-Fixtures definieren erwarteten SVG-Elementtyp, Geometrie, Farbe, Reihenfolge
und eine Geometrietoleranz von 2 Pixeln. Die gemischte Szene muss deterministisch bleiben und
darf keine Kontur doppelt ausgeben.

## 5. Conversion-Ergebnis und History

`ConversionResult` enthält mindestens:

- SVG-String und Abmessungen.
- vollständigen Snapshot der wirksamen Einstellungen.
- Laufzeit, Dateigröße und Pfad-/Formanzahlen.
- Transparenzstatus und nicht fatale Warnungen.

Bild- und Parameteränderungen erzeugen nach kurzer Entprellung automatisch eine flüchtige
SVG-Vorschau. Nur „Variante übernehmen“ erzeugt daraus einen unveränderlichen Run mit stabiler ID
und Zeitstempel. Die Session-History hält das unveränderliche Rasteroriginal und alle übernommenen
Runs des aktuellen Bildes im Arbeitsspeicher. Einzelne Runs können gezielt gelöscht werden.

Ein Run kann angezeigt, als A oder B gewählt, als SVG heruntergeladen und zum Wiederherstellen
seiner Einstellungen verwendet werden. Er referenziert unveränderlich die aktive Original- oder
KI-Eingabeversion; Run-Auswahl und Downloads bleiben von späteren Eingabewechseln unabhängig.

## 6. A/B-Vergleich

- Original und Run oder zwei Runs werden tastaturbedienbar als A und B markiert.
- Ein Slider beschneidet beide Ergebnisse deckungsgleich von 0 bis 100 Prozent.
- Unterschiedliche Maße werden in derselben Vergleichs-ViewBox normalisiert.
- Zoom von 25 bis 800 Prozent und Pan verwenden für A und B denselben Viewport-Zustand; Mausrad,
  Drag, Pinch und Tastatur bleiben synchron.
- Eine schema-basierte Tabelle zeigt Eingabeversion und beide Parameterwerte.
- „Nur Unterschiede“ zeigt jeden abweichenden Parameter genau einmal.
- Download A und Download B exportieren bytegenau den jeweils ausgewählten Run.

## 6.1 Manuelle Auswahl

Der Zauberstab arbeitet ohne Modell, GPU oder Netzwerk. Ein Klick wählt den zusammenhängenden
Bereich aus, dessen RGBA-Kanäle innerhalb der gewählten Empfindlichkeit zur angeklickten Farbe
liegen. Jeder Kandidat wird mit dieser Ausgangsfarbe verglichen, damit die Auswahl nicht durch
einen Farbverlauf in das Motiv wandert.

Die deckungsgleiche Maske wird vor jeder Änderung sichtbar angezeigt. Eine Änderung der
Empfindlichkeit von 0 bis 100 Prozent berechnet sie sofort mit demselben Klickpunkt neu.
„Auswahl entfernen“ setzt nur den Alpha-Kanal der markierten Pixel auf null; „Verwerfen“ ändert
nichts. Das Ergebnis wird als manuell bearbeitete Eingabeversion übernommen, während Original und
bereits angenommene History-Runs erhalten bleiben.

## 7. KI-Manager

Die zentrale Modell-Registry besitzt die Zustände `not-loaded`, `downloading`, `initializing`,
`ready`, `unloading` und `error`. Die UI zeigt Modell, Aufgabe, feste Revision, Größe, Lizenz,
tatsächliches Backend und echten Bytefortschritt.

Verbindliche Werkzeuge:

- MODNet-basierte lokale Hintergrundentfernung mit Alpha-Ergebnis.
- SAM-basierte Objektauswahl mit mindestens zwei positiven und einem negativen Punkt sowie
  Anwenden, Invertieren und Verwerfen.

Parallelaufrufe teilen denselben Ladevorgang. Fehler bleiben retrybar. Entladen wartet auf
laufende Arbeit und gibt besessene Session-, Tensor- und Cache-Ressourcen genau einmal frei.
Ein angewendetes KI-Ergebnis wird als versionierte Eingabe in Conversion, History und Vergleich
übernommen; das Original bleibt erhalten.

Konkrete Modelle dürfen erst nach Prüfung von Quelle, Revision, Größe, Lizenz und Runtime in
die Registry gelangen.

Vor dem Rendern prüft die App die benötigten Hardwaremerkmale. Ein GPU-exklusives Modell und
seine UI- sowie WebMCP-Aktionen werden nur angeboten, wenn der aktive Adapter alle benötigten
Merkmale besitzt. SlimSAM erfordert `shader-f16`; MODNet bleibt durch seinen WASM-Fallback
unabhängig davon verfügbar.

## 7.1 Installierbare App-Eingänge

Das statische Studio besitzt ein Web-App-Manifest und kann auf unterstützten Plattformen als PWA
installiert werden. Ein Share Target nimmt genau ein PNG-, JPEG- oder WebP-Bild entgegen;
Desktop-Dateihandler akzeptieren dieselben Typen. Beide Eingänge verwenden den vorhandenen
validierten Bild-Loader und erzeugen keinen zweiten Workspace-Zustand.

Der Service Worker dient ausschließlich als einmalige lokale Brücke zwischen Share-POST und
Anwendungsnavigation. Das Bild wird beim ersten Lesen entfernt. App-Shell, Conversion-History,
SVGs und KI-Modelle werden dadurch weder offline versprochen noch zusätzlich persistiert. Ohne
PWA-Unterstützung bleibt der normale Browserablauf vollständig erhalten.

## 8. WebMCP

WebMCP ist eine progressive Erweiterung hinter Feature Detection. Das MVP bietet eng
typisierte Werkzeuge für den sichtbaren Produktablauf:

- `get_capabilities`: unterstützte Kernfunktionen lesen.
- `get_workspace_state`: Einstellungen, aktuellen Run, History, A/B-Auswahl und Modellzustände
  lesen.
- `configure_conversion`: dieselben drei Parameter mit denselben Validatoren setzen.
- `convert_current_image`: die aktuelle Live-Vorschau als sichtbaren History-Run übernehmen.
- `select_history_run`: einen Run sichtbar auswählen; `select_comparison_a` und
  `select_comparison_b`: Original oder Run sichtbar vergleichen.
- `delete_history_run`: einen Run aus der aktuellen Browser-Session entfernen.
- `download_selected_svg`: exakt den sichtbaren ausgewählten Run exportieren.
- `load_model`, `retry_model` und `unload_model`: dieselben verfügbaren Modelle wie der
  KI-Manager bedienen.
- `apply_background_removal` und, bei `shader-f16`, `apply_smart_selection`: KI-Ergebnisse als
  versionierte Eingabe in den normalen Workflow übernehmen.

Mensch und Agent verwenden dieselben Application Services und denselben sichtbaren Zustand.
Lokale Bilder gelangen über die browserbestätigte Dateiübergabe in den Tab. Danach ist jede
beworbene zustandsändernde UI-Funktion durch das zugehörige WebMCP-Werkzeug erreichbar. Eine
ausführbare Capability Map hält UI-Kommandos und Tool-Registrierung deckungsgleich.
Die Benutzeroberfläche funktioniert unabhängig von der WebMCP-Unterstützung. Statische
Werkzeugbeschreibungen sowie eng begrenzte Eingaben und Fehler schützen den Bildkontext.

Die Produktionsabnahme des neuen Studios läuft auf `https://studio.img2.download`. Die Domain liefert
`Origin-Agent-Cluster: ?1` und `Permissions-Policy: tools=(self)` und registriert die Werkzeuge
im sichtbaren Dokumentkontext.

Die Produktabnahme erfolgt in Chrome 149 oder neuer mit aktivierter WebMCP-Testfunktion. Sollte
der korrekt implementierte WebMCP-Kanal dort nachweislich nicht durch den Browser-Agenten
nutzbar sein, darf eine ChatGPT-App mit Apps SDK und MCP-Server denselben Agenten-Anwendungsfall
übernehmen. Oberfläche, Server- und Dateifluss dieser Alternative werden vor der Einreichung
sichtbar dokumentiert und erneut in Chrome abgenommen.

## 9. Ausgabe

SVG ist das einzige Ausgabeformat des Submission-MVP. Der Download entspricht bytegenau dem
angezeigten oder auf Seite A/B gewählten Run und verwendet einen nachvollziehbaren Dateinamen.

## 10. Qualitätsanforderungen

- Ein frischer Checkout baut und testet reproduzierbar mit committed Lockfiles.
- TypeScript ist exakt auf `7.0.2` gepinnt und läuft strikt.
- Rust-Formatierung und Clippy sowie Typecheck, Lint und Tests sind warnungsfrei.
- Handgeschriebene Quell- und Testdateien haben maximal 1000 Zeilen.
- Die UI bleibt während längerer WASM- und KI-Arbeit bedienbar.
- Fallbacks sind sichtbar und erhalten die dokumentierten Qualitäts-, Datenschutz-, Lizenz-
  und Modellbackend-Verträge.
- Jeder beworbene Ablauf ist durch ausführbare Abnahme und echten Browser-Smoke-Test belegt.
