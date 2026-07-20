# Logo-Optimierung

## Ziel und Methode

Das gebündelte 1280 × 876-JPEG wurde am 20. Juli 2026 mit der produktiven Browser-Pipeline in
Google Chrome vermessen. Ein Einzelfaktor-Lauf variiert jeweils genau einen Wert um das bisherige
Profil: 576 Pixel Höhe, Farbe, Farbpräzision 6, Speckle 4, Pfadpräzision 2, SVG-Skalierung 100 %
und Polygonerkennung. Danach wurden neun aus den Ergebnissen abgeleitete Kombinationen geprüft.
Ein vollständiges kartesisches Produkt wird bewusst vermieden.

Qualität wird nach dem Rendern von Original und SVG auf dieselben 256 × 175 Pixel mit drei
Kennzahlen von 0 bis 1 bewertet:

- Farbübereinstimmung: eins minus normalisierter RGB-Fehler.
- Strukturähnlichkeit: gekachelte SSIM über die Luminanz.
- Silhouette: Intersection over Union aller nicht schwarzen Pixel.

Die Kennzahlen verhindern, dass ein fast leeres SVG allein wegen weniger Pfaden gewinnt. Sie sind
ein reproduzierbarer Proxy; die Pareto-Kandidaten werden zusätzlich direkt in Chrome bei 100 und
156 Prozent Zoom gegen das Original geprüft.

## Ergebnis

Das gewählte Profil behält Farbpräzision 6 und 576 Pixel Zielhöhe, erhöht Speckle auf 16 und setzt
Pfadpräzision auf 0. Es reduziert 2.798 auf 315 Pfade (−88,7 %) und 1.360.284 auf 389.707 Bytes
(−71,4 %). Farbübereinstimmung 0,977, Strukturähnlichkeit 0,942 und Silhouette 0,993 bleiben für
den visuellen Logo-Einsatz ausreichend. Die Chrome-Abnahme bestätigt eine geschlossene Kontur,
erkennbare Farbbereiche und die prägenden Kristallfacetten.

`path_precision` verändert nur die Dezimalstellen der Koordinaten: 0 statt 2 Stellen spart im
Basislauf 449.985 Bytes, ohne die 2.798 Pfade zu reduzieren. Die eigentliche Pfadreduktion kommt
vom Speckle-Filter. Dessen VTracer-Wert wird als Seitenlänge interpretiert; intern gilt die
quadratische Mindestfläche, sodass 16 einer Clusterfläche von 256 Pixeln entspricht.

## Messwerte

| Szenario | Pfade | KiB | Farbe | Struktur | Silhouette |
|---|---:|---:|---:|---:|---:|
| `baseline` | 2798 | 1328,4 | 0,985 | 0,973 | 0,994 |
| `color-1` | 1 | 0,3 | 0,747 | 0,107 | 0,630 |
| `color-2` | 1 | 0,3 | 0,747 | 0,107 | 0,630 |
| `color-3` | 1 | 0,3 | 0,747 | 0,107 | 0,630 |
| `color-4` | 205 | 66,0 | 0,756 | 0,144 | 0,630 |
| `color-5` | 1352 | 720,4 | 0,963 | 0,889 | 0,994 |
| `color-7` | 3341 | 1583,7 | 0,989 | 0,983 | 0,993 |
| `color-8` | 3461 | 1662,4 | 0,989 | 0,982 | 0,993 |
| `speckle-0` | 17659 | 3116,4 | 0,985 | 0,972 | 0,994 |
| `speckle-1` | 3782 | 1479,9 | 0,985 | 0,974 | 0,994 |
| `speckle-2` | 3782 | 1479,9 | 0,985 | 0,974 | 0,994 |
| `speckle-8` | 1036 | 923,7 | 0,983 | 0,968 | 0,993 |
| `speckle-16` | 315 | 589,7 | 0,977 | 0,942 | 0,993 |
| `speckle-32` | 114 | 401,3 | 0,967 | 0,892 | 0,993 |
| `speckle-64` | 34 | 234,8 | 0,949 | 0,811 | 0,989 |
| `path-precision-0` | 2798 | 889,0 | 0,985 | 0,972 | 0,994 |
| `path-precision-1` | 2798 | 1149,5 | 0,985 | 0,973 | 0,994 |
| `path-precision-3` | 2798 | 1430,7 | 0,985 | 0,973 | 0,994 |
| `path-precision-4` | 2798 | 1521,3 | 0,985 | 0,973 | 0,994 |
| `raster-percent-25` | 665 | 274,6 | 0,976 | 0,915 | 0,985 |
| `raster-percent-50` | 1901 | 868,3 | 0,985 | 0,971 | 0,994 |
| `raster-percent-75` | 3364 | 1616,6 | 0,983 | 0,968 | 0,994 |
| `raster-height-720` | 3709 | 1873,6 | 0,984 | 0,971 | 0,994 |
| `raster-original` | 5037 | 2569,6 | 0,982 | 0,965 | 0,995 |
| `detail-smooth` | 2480 | 1239,1 | 0,982 | 0,964 | 0,994 |
| `detail-sharpen` | 3051 | 1409,4 | 0,986 | 0,974 | 0,994 |
| `filter-grayscale` | 1492 | 809,4 | 0,908 | 0,948 | 0,993 |
| `filter-monochrome-64` | 101 | 90,3 | 0,762 | 0,592 | 0,800 |
| `filter-monochrome-128` | 111 | 78,2 | 0,793 | 0,511 | 0,373 |
| `filter-monochrome-192` | 31 | 14,5 | 0,735 | 0,329 | 0,055 |
| `svg-scale-50` | 2798 | 1358,5 | 0,985 | 0,973 | 0,994 |
| `svg-scale-200` | 2798 | 1353,0 | 0,985 | 0,973 | 0,994 |
| `shape-detection-off` | 2799 | 1328,6 | 0,985 | 0,973 | 0,994 |
| `combo-balanced` | 397 | 323,1 | 0,941 | 0,778 | 0,993 |
| `combo-compact` | 117 | 186,4 | 0,952 | 0,819 | 0,990 |
| `combo-clean-color` | 295 | 490,5 | 0,975 | 0,933 | 0,992 |
| `combo-sharp` | 544 | 526,4 | 0,966 | 0,902 | 0,994 |
| `combo-fidelity` | 315 | 380,6 | 0,977 | 0,942 | 0,993 |
| `combo-small-raster` | 665 | 181,0 | 0,975 | 0,910 | 0,983 |
| `combo-medium-raster` | 221 | 259,6 | 0,974 | 0,925 | 0,992 |
| `combo-color-five` | 480 | 332,8 | 0,961 | 0,881 | 0,992 |
| `combo-color-five-compact` | 157 | 193,2 | 0,966 | 0,893 | 0,991 |

Die Größenachse konzentriert sich auf pfadsenkende oder unmittelbar benachbarte Werte. Noch
größere Rasterpresets wurden nicht einzeln ausgeführt, nachdem bereits 720 Pixel und Originalgröße
mehr Pfade, mehr Bytes und keinen relevanten Qualitätsgewinn gegenüber 576 Pixeln zeigten.

## Pixelaufbereitung

VTracer erhält keine JPEG-, PNG- oder BMP-Datei, sondern den vom Canvas dekodierten verlustfreien
RGBA-Puffer. Eine zusätzliche BMP-Konvertierung ändert deshalb keine Eingangspixel. JPEG-Artefakte
bleiben dagegen als echte Farbunterschiede erhalten und können zusätzliche Cluster erzeugen.

Laser- und CNC-Werkzeuge verwenden für saubere Konturen vor allem Downsampling, Spot-Removal,
Glättung und Schwellwerte. LightBurn bietet zusätzlich Unsharp Masking an; sein Trace-Dialog
reduziert mit Smoothness und Optimize die Knotenzahl. LaserGRBL beschreibt Downsampling explizit
als Weg, unwichtige Rasterdetails zu verlieren. Das Studio stellt deshalb einen deterministischen
3×3-Gaußfilter und eine milde Unscharfmaske ohne neue Laufzeitabhängigkeit bereit. Beim Testlogo
bleibt der Detailfilter aus: Glätten spart nur 318 Pfade, Schärfen erhöht die Zahl um 253.

Quellen: [VTracer README](https://github.com/visioncortex/vtracer),
[LightBurn Image Tracing](https://docs.lightburnsoftware.com/legacy/Tools/TracingImages),
[LightBurn Image Properties](https://docs.lightburnsoftware.com/legacy/UI/ShapeProperties),
[LaserGRBL Vectorization](https://lasergrbl.com/usage/raster-image-import/vectorization-tool/).

## Reproduzieren

```bash
npm run build
npm run preview --workspace=img2svg-studio-web -- --host 127.0.0.1 --port 4173
# zweites Terminal
npm run benchmark:logo --workspace=img2svg-studio-web
```

Das Skript gibt Szenarien und Ergebnisse als JSON aus. Es startet installiertes Google Chrome im
Headless-Modus, bedient die sichtbaren Regler und verwendet die produktive WASM-Ausgabe.
