# Funktionsvergleich Vektorisierer

Stand: 21. Juli 2026. Bewertet wurden nur Funktionen, die den lokalen, interaktiven
Raster-zu-SVG-Workflow des Studios sinnvoll vertiefen.

## Bereits abgedeckt

Das Studio besitzt Live-Vorschau, deckungsgleichen Original/SVG-Vergleich, Zoom und Pan,
Rastervorbereitung, Farb- und Kurvenparameter, Speckle-Filter, native Formerkennung,
Pfad-/Dateigröße, Rechenzeit, persistente Presets, Verlauf und WebMCP-Steuerung.

## Sinnvolle nächste Erweiterungen

| Priorität | Erweiterung                                                   | Nutzen                                                                                         |
| --------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1         | Anker- und Farbanzahl in den Dateiinformationen               | Ergänzt Dateigröße und Pfadanzahl um die wichtigsten Werte für Editierbarkeit und Komplexität. |
| 2         | Begrenzte, editierbare Farbpalette mit Pipette                | Besonders bei Logos lassen sich Zwischenfarben vermeiden und Markenfarben gezielt festhalten.  |
| 3         | Nachträgliche Pfadvereinfachung mit sichtbarer Abweichung     | Reduziert Anker und Dateigröße kontrolliert, ohne die Rasteranalyse erneut auszuführen.        |
| 4         | Ausgabe als Füllungen oder Mittellinien/Striche               | Macht Laser-, Plotter- und CNC-Ausgaben wesentlich brauchbarer.                                |
| 5         | Einordnung als Foto, geglättete Grafik oder harte Pixelgrafik | Kann ein geeignetes Startpreset vorschlagen, ohne Detailparameter zu verbergen.                |
| 6         | Farbe gezielt ignorieren                                      | Ergänzt den Zauberstab um einen reproduzierbaren, presetfähigen Hintergrundfarbvertrag.        |

Anker/Farben, Palette und Vereinfachung bilden den empfohlenen nächsten Slice. Sie zahlen direkt
auf das bestehende Ziel „kleineres SVG bei nachvollziehbarer Qualität“ ein. Strichausgabe folgt als
eigener Engine-Slice, weil sie die Bedeutung der resultierenden Geometrie ändert.

Adobe Image Trace bietet unter anderem Pfade, Anker und Farben als Ergebnisinformationen,
begrenzte Paletten, Füll-/Strichausgabe, überlappende oder anliegende Flächen, Formerkennung und das
Ignorieren einer Farbe. Adobe beschreibt Pfadvereinfachung ausdrücklich als Mittel für weniger
Anker, kleinere Dateien sowie schnelleres Anzeigen und Drucken. Vector Magic trennt Foto,
geglättete Grafik und Grafik mit harten Kanten, bietet Detailstufen und vorgeschlagene Paletten und
stellt den Zusammenhang zwischen mehr Formen, höherer Genauigkeit und größeren Dateien sichtbar
dar. Potrace bestätigt Speckle-Unterdrückung, Eckenglättung, Kurvenoptimierung und
Koordinatenquantisierung als die kompakten Kernregler eines Schwarzweiß-Tracers.

Offizielle Quellen:

- [Adobe Image Trace options](https://helpx.adobe.com/uk/illustrator/desktop/manage-objects/traces-mockups-symbols/image-trace-panel-options.html)
- [Adobe path simplification](https://helpx.adobe.com/illustrator/desktop/draw-shapes-and-paths/modify-paths/simplify-path-benefits.html)
- [Vector Magic tracing workflow](https://vectormagic.com/support/tutorials/how-to-use-vector-magic)
- [Potrace parameters](https://potrace.sourceforge.net/potrace.1.html)
