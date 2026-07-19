# Produktspezifikation — Submission-MVP

## 1. Verbindlicher Umfang

img2svg Studio ist eine statisch auslieferbare Single-Page-Anwendung. Sie konvertiert lokale
Rasterbilder in SVG, hält mehrere Ergebnisse im Verlauf, vergleicht zwei Varianten und kann
optionale Browser-KI sowie WebMCP explizit zuschalten.

Diese Spezifikation beschreibt ausschließlich den Umfang der Build-Week-Einreichung. Nur
Verhalten, das in `TASKS.md` steht, getestet ist und im Handbuch als verfügbar bezeichnet wird,
darf in Demo, README oder Submission als vorhanden beworben werden.

Die UI-Texte sind deutsch. Code-Bezeichner sind englisch.

## 2. Eingaben und Datenschutz

- Mindestens PNG, JPEG und WebP werden über Browser-APIs dekodiert.
- Dateiauswahl und Drag-and-drop verwenden dieselbe validierte Decodergrenze.
- Das unveränderte Original bleibt für die gesamte Sitzung verfügbar.
- Beschädigte, zu große und nicht unterstützte Dateien erzeugen verständliche Fehler.
- Bilder werden nicht an ein Anwendungs-Backend übertragen.
- Es gibt keine Telemetrie, Tracker oder externen Fonts.
- Netzwerkzugriffe für KI-Modelle beginnen nur nach sichtbarer Nutzeraktion.

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
und Polygon. Formtypen können einzeln aktiviert werden. Nicht ausreichend sicher erkannte
Konturen bleiben als Pfad erhalten; Inhalte werden weder verworfen noch als Raster eingebettet.

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
Zeitstempel. Die Session-History enthält höchstens zehn Runs und persistiert keine großen
Bild- oder SVG-Artefakte ungeprüft in `localStorage`.

Ein Run kann angezeigt, als A oder B gewählt, als SVG heruntergeladen und zum Wiederherstellen
seiner Einstellungen verwendet werden.

## 6. A/B-Vergleich

- Zwei Runs werden tastaturbedienbar als A und B markiert.
- Ein Slider beschneidet beide Ergebnisse deckungsgleich von 0 bis 100 Prozent.
- Unterschiedliche Maße werden in derselben Vergleichs-ViewBox normalisiert.
- Eine schema-basierte Tabelle zeigt beide Parameterwerte.
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

WebMCP ist eine progressive Erweiterung hinter Feature Detection. Das MVP bietet:

- `get_capabilities`: unterstützte Kernfunktionen lesen.
- `configure_conversion`: dieselben drei Parameter mit denselben Validatoren setzen.
- `convert_current_image`: den normalen sichtbaren Conversion-Service ausführen.

Mensch und Agent verwenden dieselben Application Services und denselben sichtbaren Zustand.
Ohne unterstützte WebMCP-Schnittstelle bleibt die gesamte Benutzeroberfläche funktionsfähig.
Werkzeugbeschreibungen enthalten keine Bildinhalte; Eingaben und strukturierte Fehler sind eng
begrenzt.

## 9. Ausgabe

SVG ist das einzige Ausgabeformat des Submission-MVP. Der Download entspricht bytegenau dem
angezeigten oder auf Seite A/B gewählten Run und verwendet einen nachvollziehbaren Dateinamen.

## 10. Bewusste Nicht-Ziele

Nicht Bestandteil der Einreichung sind:

- Cloud-Speicher, Nutzerkonto, serverseitige Verarbeitung oder Zusammenarbeit.
- PNG-/WebP-Export, CLI und weitere Rasterformate über die Browserdekodierung hinaus.
- eigene Presets, freie Zielmaße, Drehung, Spiegelung und zusätzliche Vorverarbeitungsfilter.
- eigener SVG-Path-Optimizer, alternative Reststrategien und Gradientenerkennung.
- synchrones Zoom/Pan, Lupe und dauerhafte Run-Persistenz.
- KI-Upscaling oder weitere KI-Modelle.

Diese Punkte werden weder als vorhanden noch als spätere Projektphase beworben.

## 11. Qualitätsanforderungen

- Ein frischer Checkout baut und testet reproduzierbar mit committed Lockfiles.
- TypeScript ist exakt auf `7.0.2` gepinnt und läuft strikt.
- Rust-Formatierung und Clippy sowie Typecheck, Lint und Tests sind warnungsfrei.
- Keine handgeschriebene Quell- oder Testdatei überschreitet 1000 Zeilen.
- Die UI bleibt während längerer WASM- und KI-Arbeit bedienbar.
- Keine stillen Fallbacks ändern Qualität, Datenschutz, Lizenz oder Modellbackend.
- Jeder beworbene Ablauf ist durch ausführbare Abnahme und echten Browser-Smoke-Test belegt.
