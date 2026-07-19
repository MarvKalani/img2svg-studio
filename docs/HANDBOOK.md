# img2svg Studio — Handbuch

## Status

Dieses Handbuch wächst zusammen mit der Anwendung. Es beschreibt nur bereits entschiedene
oder implementierte Funktionen und kennzeichnet noch nicht verfügbare Abläufe ausdrücklich.

Aktueller Stand: Produktspezifikation, UI-Mockup und Test-Fixtures sind vorhanden; die
Anwendung selbst ist noch nicht implementiert.

## Produktidee

img2svg Studio ist ein lokaler Bildkonverter im Browser. Ein Rasterbild wird mit verschiedenen
Einstellungen in SVG umgewandelt. Mehrere Ergebnisse bleiben im Verlauf erhalten und können
als A und B direkt miteinander verglichen werden.

Kein Bild wird an ein Anwendungs-Backend hochgeladen. Optionale KI-Modelle werden erst auf
Anforderung in den Browser geladen.

## Oberfläche

Der verbindliche erste UI-Entwurf liegt unter
[`docs/mockups/img2svg-ui-v1.png`](mockups/img2svg-ui-v1.png).

Die Oberfläche besteht aus:

- einer Kopfzeile mit Ansichten und Status.
- einer linken Seitenleiste für Bild, Größe, Parameter und KI-Werkzeuge.
- einer großen Arbeitsfläche für Original, SVG und A/B-Vergleich.
- einer Parameter-Diff-Tabelle unter dem Vergleich.
- einem Verlauf mit Conversion-Runs am unteren Rand.
- einer schmalen Statuszeile mit Größe, Pfaden, Formen und Laufzeit.

## Geplanter Grundablauf

1. Bild per Drag-and-drop oder Dateiauswahl laden.
2. Zielgröße und wenige relevante Parameter wählen.
3. „Konvertieren“ ausführen.
4. Ergebnis prüfen und als SVG herunterladen.
5. Parameter ändern und einen weiteren Run erzeugen.
6. Zwei Runs im Verlauf als A und B auswählen.
7. Darstellung und Parameterunterschiede vergleichen.

Dieser Ablauf wird mit jedem vertikalen Slice ergänzt und erst dann als verfügbar bezeichnet,
wenn er im Browser getestet wurde.

## Verlauf und A/B-Vergleich

Jede Konvertierung erzeugt einen unveränderlichen Run mit SVG, Einstellungen und Statistiken.
Der Verlauf zeigt die letzten Runs als Karten. Zwei Karten können als A und B markiert werden.

Der Vergleich soll:

- beide Ergebnisse deckungsgleich darstellen.
- per Slider zwischen A und B wechseln.
- unterschiedliche Parameter hervorheben.
- Downloads für beide ausgewählten Runs anbieten.
- Einstellungen eines älteren Runs wiederherstellen können.

## Parameter

Die Seitenleiste startet bewusst mit wenigen wirksamen Parametern. Weitere Optionen werden
erst ergänzt, wenn ihr kompletter Weg von UI über WASM bis zur Engine funktioniert und getestet
ist. Verbindliche Werte und Defaults stehen in der Produktspezifikation.

## KI-Manager

KI-Modelle werden nicht automatisch geladen. Der KI-Manager zeigt pro Modell:

- Name, Aufgabe, Größe und Lizenz.
- Zustand: nicht geladen, Download, Initialisierung, bereit oder Fehler.
- echten Downloadfortschritt.
- verwendetes Backend, beispielsweise WebGPU oder WASM.
- Aktionen zum Laden, Wiederholen und Entladen.

Entladen muss Modell-Session, GPU-/WASM-Ressourcen und zugehörige Caches tatsächlich
freigeben. MODNet für Hintergrundentfernung wird als erstes reales Modell integriert; SAM
Smart Select folgt danach innerhalb des Einreichungsumfangs.

## WebMCP

In einem unterstützten Browser kann ein Agent dieselben sichtbaren Anwendungsdienste verwenden
wie ein Mensch. Der Submission-Umfang enthält Werkzeuge zum Lesen der Fähigkeiten,
Konfigurieren der Konvertierung und Starten eines sichtbaren Runs.

WebMCP ist eine progressive Erweiterung. Ohne WebMCP bleibt die gesamte UI bedienbar.

## Formerkennungs-Fixtures

Die Ground-Truth-Bilder unter `fixtures/shape-recognition` prüfen Kreis, Ellipse, Rechteck,
Linie, Polygon und eine gemischte Szene. Tests vergleichen später nicht nur gerenderte Pixel,
sondern auch SVG-Elementtyp und Geometrie innerhalb einer definierten Toleranz.

## Datenschutz

- keine Bild-Uploads an ein Anwendungs-Backend.
- keine Telemetrie und keine Tracker.
- keine externen Fonts.
- Netzwerkzugriffe für KI-Modelle nur nach sichtbarer Nutzeraktion.

## Dokumentationspflege

Jeder repo-wirksame Slice prüft dieses Handbuch:

- Nutzerablauf geändert: Handbuch im selben Commit aktualisieren.
- öffentlicher Vertrag geändert: technische Spezifikation im selben Commit aktualisieren.
- Produkt- oder Architekturentscheidung geändert: Entscheidungsprotokoll im selben Commit
  aktualisieren.
- kein Dokumentationsbedarf: im Review bewusst bestätigen, statt ihn still zu übergehen.

`TASKS.md` enthält nur offene Arbeit. Vor der Implementierung wird das dortige
Given–When–Then-Szenario als ausführbarer Test angelegt. Nach bestandener Orchestrator-Abnahme
wird der Task im selben Commit aus der Liste entfernt; Commit-Beschreibung, Test und Handbuch
bleiben als dauerhafter Nachweis erhalten.

Screenshots und Beispiele werden aktualisiert, sobald der jeweilige Ablauf tatsächlich
funktioniert. Veraltete Anleitungen bleiben nicht als historische Beschreibung im Handbuch.
