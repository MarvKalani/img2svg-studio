# Produktspezifikation — Submission-MVP

## 1. Verbindlicher Umfang

img2svg Studio ist eine statisch auslieferbare Single-Page-Anwendung. Sie konvertiert lokale
Rasterbilder in SVG, hält mehrere Ergebnisse im Verlauf, vergleicht zwei Varianten und kann
optionale Browser-KI sowie WebMCP explizit zuschalten.

`TASKS.md`, ausführbare Tests und Handbuch bilden gemeinsam den verbindlichen Umfang der
Build-Week-Einreichung.

Die UI-Texte sind deutsch. Code-Bezeichner sind englisch.

## 2. Eingaben und Datenschutz

- PNG, JPEG und WebP bis 25 MB werden über Browser-APIs dekodiert.
- Dateiauswahl und Drag-and-drop verwenden dieselbe validierte Decodergrenze.
- Das unveränderte Original bleibt für die gesamte Sitzung verfügbar.
- Beschädigte, zu große und nicht unterstützte Dateien erzeugen verständliche Fehler.
- Ein fehlgeschlagener neuer Ladevorgang erhält die letzte gültige Vorschau.
- Bildverarbeitung und Bilddaten bleiben im Browser.
- Die App verwendet lokale Fonts und verzichtet auf Telemetrie und Tracker.
- KI-Modellzugriffe beginnen nach sichtbarer Nutzeraktion.

## 3. Oberfläche

Der akzeptierte Entwurf besteht aus:

- Kopfzeile und Statusanzeige.
- linker Leiste für Bild, Zielgröße, wenige Konvertierungsparameter und KI-Manager.
- zentraler Arbeitsfläche für Original, SVG und A/B-Überblendung.
- Parameter-Diff unter dem Vergleich.
- Session-History mit höchstens zehn Runs am unteren Rand.

Alle Kernaktionen sind tastaturbedienbar und zeigen ihren Lade-, Fehler- oder Leerzustand.

## 4. Konvertierung

### 4.1 Robuster Kern

Der Rust-Core erhält validierte RGBA-Bytes und verwendet eine fest gepinnte `visioncortex`-
Version für Clustering und Kontur-Tracing. Eine schmale `wasm-bindgen`-Grenze liefert ein
typisiertes `ConversionResult` an die Web-Anwendung.

Gleiche RGBA-Bytes und Einstellungen erzeugen byteidentische SVG-Ausgabe. Maße, Attribut- und
Elementreihenfolge sowie Zahlenformatierung sind nicht von Locale, Uhrzeit oder Hash-Reihenfolge
abhängig. Transparente Bildbereiche bleiben transparent.

### 4.2 Verbindliche Parameter

Das MVP stellt bewusst nur drei unmittelbar wirksame Parameter bereit:

| Parameter | Bereich | Default | Bedeutung |
|---|---:|---:|---|
| `color_precision` | 1–8 Bit/Kanal | 7 | Farbzusammenfassung |
| `filter_speckle` | 0–1000 px | 4 | kleine Segmente entfernen |
| `scale_percent` | 10–400 % | 100 | proportionale Zielgröße |

Eine kanonische Definition speist TypeScript-Validierung, Rust/WASM-Vertrag, UI, Run-Snapshot,
Parameter-Diff und WebMCP. Ungültige Werte werden abgelehnt und nie still korrigiert.

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

Jede erfolgreiche Konvertierung erzeugt einen unveränderlichen Run mit stabiler ID und
Zeitstempel. Die Session-History hält höchstens zehn Runs im Arbeitsspeicher.

Ein Run kann angezeigt, als A oder B gewählt, als SVG heruntergeladen und zum Wiederherstellen
seiner Einstellungen verwendet werden. Er referenziert unveränderlich die aktive Original- oder
KI-Eingabeversion; Run-Auswahl und Downloads bleiben von späteren Eingabewechseln unabhängig.

## 6. A/B-Vergleich

- Zwei Runs werden tastaturbedienbar als A und B markiert.
- Ein Slider beschneidet beide Ergebnisse deckungsgleich von 0 bis 100 Prozent.
- Unterschiedliche Maße werden in derselben Vergleichs-ViewBox normalisiert.
- Eine schema-basierte Tabelle zeigt Eingabeversion und beide Parameterwerte.
- „Nur Unterschiede“ zeigt jeden abweichenden Parameter genau einmal.
- Download A und Download B exportieren bytegenau den jeweils ausgewählten Run.

## 7. KI-Manager

Die zentrale Modell-Registry besitzt die Zustände `not-loaded`, `downloading`, `initializing`,
`ready` und `error`. Die UI zeigt Modell, Aufgabe, feste Revision, Größe, Lizenz, tatsächliches
Backend und echten Bytefortschritt.

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

## 8. WebMCP

WebMCP ist eine progressive Erweiterung hinter Feature Detection. Das MVP bietet eng
typisierte Werkzeuge für den sichtbaren Produktablauf:

- `get_capabilities`: unterstützte Kernfunktionen lesen.
- `get_workspace_state`: Einstellungen, aktuellen Run, History, A/B-Auswahl und Modellzustände
  lesen.
- `configure_conversion`: dieselben drei Parameter mit denselben Validatoren setzen.
- `convert_current_image`: den normalen sichtbaren Conversion-Service ausführen.
- `select_history_run`, `select_comparison_a` und `select_comparison_b`: History und Vergleich
  sichtbar steuern.
- `download_selected_svg`: exakt den sichtbaren ausgewählten Run exportieren.
- `load_model`, `retry_model` und `unload_model`: denselben KI-Manager bedienen.
- `apply_background_removal` und `apply_smart_selection`: KI-Ergebnisse als versionierte
  Eingabe in den normalen Workflow übernehmen.

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
