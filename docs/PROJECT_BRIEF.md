# Projektbrief

## Kurzfassung

img2svg Studio ist ein lokales Konvertierungs- und Vergleichslabor im Browser. Nutzer laden
ein Rasterbild, wählen Qualität, Größe und optionale Formerkennung, erzeugen mehrere
Varianten und vergleichen sie unmittelbar. Eine Browser-KI kann denselben Ablauf über
strukturierte WebMCP-Werkzeuge bedienen.

## Problem

Klassische Raster-zu-SVG-Werkzeuge liefern häufig ein einzelnes Ergebnis mit vielen schwer
editierbaren Pfaden. Wer Qualität und Dateigröße abstimmen will, muss Parameter wiederholt
ändern, Dateien manuell benennen und Ergebnisse außerhalb des Werkzeugs vergleichen. Zudem
sind die Auswirkungen einzelner Einstellungen für nicht technische Nutzer kaum sichtbar.

## Lösung

img2svg Studio verbindet fünf Bausteine:

1. Eine robuste, deterministische Pfad-Vektorisierung auf Basis von `visioncortex`.
2. Optional aktivierbare native SVG-Formen wie `<circle>`, `<rect>` oder `<line>`.
3. Eine History mit A/B-Slider und automatischer Parameter-Diff-Tabelle.
4. Lokale Browser-KI für Hintergrundentfernung und Objektauswahl.
5. Eine WebMCP-Schnittstelle, über die Browser-Agenten denselben sichtbaren Kernworkflow
   zuverlässig ausführen können.

## Zielgruppen

- Designer und Entwickler, die Logos, Icons und Illustrationen weiterbearbeiten möchten.
- Nicht technische Nutzer, die verschiedene Ergebnisse visuell vergleichen wollen.
- KI-Agenten, die für den Nutzer Konvertierungsvarianten erzeugen und exportieren.
- Datenschutzbewusste Anwender, deren Bilder den Rechner nicht verlassen sollen.

## Produktversprechen

> Aus einem Bild werden nicht nur Vektoren, sondern nachvollziehbare Varianten: lokal,
> vergleichbar, reproduzierbar und auf Wunsch KI-steuerbar.

## Ziele

- Browser-dekodierbare Rasterbilder lokal in SVG umwandeln.
- Byte-identische SVG-Ausgabe bei gleicher Eingabe und gleichen Einstellungen erzeugen.
- Einstellungen und Ergebnisse so darstellen, dass ihre Wirkung verständlich wird.
- Native SVG-Formen kontrolliert einsetzen, ohne die robuste Pfad-Ausgabe zu gefährden.
- Eine proportionale Zielgröße und wenige tatsächlich wirksame Parameter unterstützen.
- WebMCP als echte Produktschnittstelle mit stabilen Schemas und klaren Rückgaben anbieten.
- Eine überzeugende Hackathon-Demo ohne Serverabhängigkeit ermöglichen.

## Nicht-Ziele des ersten Releases

- Kein Cloud-Speicher, Nutzerkonto oder serverseitiger Job-Runner.
- Kein kollaborativer Mehrbenutzerbetrieb.
- Kein eigener ML-Shape-Klassifikator.
- Keine Garantie, jedes existierende Rasterformat unabhängig vom Browser zu dekodieren.
- Kein unsichtbarer oder headless WebMCP-Betrieb; der Browser-Tab bleibt Teil des Ablaufs.
- Keine Preset-Bibliothek, zusätzlichen Exportformate, CLI oder KI-Upscaler.

## Demo-Erzählung

1. Ein Bild wird lokal geöffnet und mit den Standardeinstellungen konvertiert.
2. Eine zweite Variante verändert genau einen gut sichtbaren Parameter.
3. Beide Varianten werden mit Slider und Parameter-Diff verglichen.
4. Bei einem Icon ersetzt die optionale Formerkennung geeignete Pfade durch native Formen.
5. Ein Browser-Agent konfiguriert und startet denselben sichtbaren Ablauf über WebMCP.
6. Abschlussbotschaft: Kein Bild wurde an ein Anwendungs-Backend übertragen.

## Erfolgskriterien

- Ein neuer Nutzer kann ohne Dokumentation einen ersten Run erzeugen und herunterladen.
- Eine Änderung zwischen zwei Runs ist in der Diff-Tabelle eindeutig nachvollziehbar.
- Gleiche Eingaben erzeugen im Test byte-identische SVGs.
- Ein WebMCP-fähiger Browser-Agent kann einen geladenen Input sichtbar konfigurieren und
  konvertieren.
- Der vollständige Demo-Ablauf funktioniert reproduzierbar auf dem Zielbrowser.
