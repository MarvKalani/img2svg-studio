# img2svg Studio — Handbuch

## Status

Dieses Handbuch wächst zusammen mit der Anwendung. Es beschreibt nur bereits entschiedene
oder implementierte Funktionen und kennzeichnet noch nicht verfügbare Abläufe ausdrücklich.

Aktueller Stand: Die responsive Studio-Oberfläche ist lokal ausführbar. Kopfzeile,
Parameterleiste, A/B-Arbeitsfläche, Parameterunterschiede, leerer Verlauf und Statuszeile sind
sichtbar. PNG-, JPEG- und WebP-Bilder können lokal geladen und mit ihren echten Maßen angezeigt
werden. „Konvertieren“ erzeugt daraus über den Rust-/WASM-Kern ein echtes SVG und zeigt es in
der ersten Arbeitsfläche an.

## Produktidee

img2svg Studio ist ein lokaler Bildkonverter im Browser. Ein Rasterbild wird mit verschiedenen
Einstellungen in SVG umgewandelt. Mehrere Ergebnisse bleiben im Verlauf erhalten und können
als A und B direkt miteinander verglichen werden.

Kein Bild wird an ein Anwendungs-Backend hochgeladen. Optionale KI-Modelle werden erst auf
Anforderung in den Browser geladen.

## Oberfläche

Der verbindliche erste UI-Entwurf liegt unter
[`docs/mockups/img2svg-ui-v1.png`](mockups/img2svg-ui-v1.png).

Der in Chrome abgenommene aktuelle Stand ist hier festgehalten:
[`docs/screenshots/app-shell.png`](screenshots/app-shell.png).

Die Oberfläche besteht aus:

- einer Kopfzeile mit Ansichten und Status.
- einer linken Seitenleiste für Bild, Größe, Parameter und KI-Werkzeuge.
- einer großen Arbeitsfläche für Original, SVG und A/B-Vergleich.
- einer Parameter-Diff-Tabelle unter dem Vergleich.
- einem Verlauf mit Conversion-Runs am unteren Rand.
- einer schmalen Statuszeile mit Größe, Pfaden, Formen und Laufzeit.

### Lokal öffnen

```bash
npm ci
npm run dev --workspace=img2svg-studio-web
```

Anschließend ist die Oberfläche unter `http://127.0.0.1:5173` erreichbar. Der aktuelle Stand
funktioniert auf breiten und schmalen Viewports ohne horizontales Seitenüberlaufen.

Vor einem Commit prüft `npm run check` im Repository-Root Formatierung, Lint, Zeilenlimit,
TypeScript, schnelle Tests, Produktionsbuild sowie Rust-Formatierung und Clippy.

### Engine und WASM neu bauen

Der generierte WASM-Baustein liegt versioniert unter `web/src/wasm-pkg`, sodass Start und
Web-Build nach `npm ci` ohne lokalen Rust-Build funktionieren. Änderungen unter `crates`
werden mit Rust 1.91 oder neuer, dem Ziel `wasm32-unknown-unknown` und `wasm-pack` 0.15.0 neu
gebaut:

```bash
rustup target add wasm32-unknown-unknown
npm run build:wasm
cargo test -p img2svg-core
```

Der abgenommene Build verwendet Rust 1.97.1. Auf diesem Apple-Silicon-Mac stellt die
Homebrew-Installation den Rustup-Compiler für den WASM-Build mit
`PATH="/opt/homebrew/opt/rustup/bin:$PATH" npm run build:wasm` bereit.

## Bild laden

„Bild wählen“ öffnet die lokale Dateiauswahl. Alternativ kann ein Bild auf die gestrichelte
Eingabefläche gezogen werden. Beide Wege verwenden dieselbe Decodergrenze.

Unterstützt werden PNG, JPEG und WebP bis 25 MB. Nach erfolgreichem Laden zeigt die Oberfläche
Dateiname, Format, echte Pixelmaße, eine Miniatur und die große Vorschau. Die Vorschau verwendet
eine lokale `blob:`-URL; die Bilddaten werden nicht übertragen.

Beschädigte Dateien, andere Formate und Dateien über 25 MB zeigen einen verständlichen Fehler.
Eine bereits geladene gültige Vorschau bleibt dabei erhalten. Beim Laden eines neuen gültigen
Bildes wird die vorherige Objekt-URL freigegeben.

## Konvertieren

Nach dem Laden aktiviert sich „Konvertieren“. Der Browser liest die RGBA-Pixel lokal aus und
übergibt sie an einen Web Worker. Dort erzeugt der Rust-Core über die schmale WASM-Grenze ein
SVG, während die Oberfläche bedienbar bleibt. Das Ergebnis ersetzt die Rastervorschau in
„A · Variante“; die Statuszeile bestätigt den Abschluss.

Der aktuelle kanonische Lauf verwendet die Originalmaße und deterministische
`visioncortex`-Standardeinstellungen. Gleiche RGBA-Pixel erzeugen byteidentisches SVG. Die
Ausgabe besitzt eine passende `viewBox`, und vollständig transparente Bildbereiche erzeugen
kein Hintergrundelement.

### SVG herunterladen

Nach einer erfolgreichen Konvertierung erscheint oben rechts in „A · Variante“ die Aktion
„SVG herunterladen“. Sie serialisiert genau das aktuell dargestellte SVG und speichert es mit
dem Namen des Rasterbildes und der Endung `.svg`, beispielsweise `circle.svg`.

Ein späterer Konvertierungsfehler zeigt seine verständliche Meldung direkt beim Eingabebild.
Das letzte erfolgreiche SVG und dessen Download bleiben verfügbar; „Konvertieren“ ist danach
erneut bedienbar.

## Grundablauf

1. Bild per Drag-and-drop oder Dateiauswahl laden.
2. „Konvertieren“ mit den kanonischen Standardeinstellungen ausführen.
3. Das echte SVG in „A · Variante“ prüfen.
4. Zielgröße und relevante Parameter variieren.
5. Ergebnis als SVG herunterladen und weitere Runs erzeugen.
6. Zwei Runs im Verlauf als A und B auswählen.
7. Darstellung und Parameterunterschiede vergleichen.

Dieser Ablauf wird mit jedem vertikalen Slice ergänzt und erst dann als verfügbar bezeichnet,
wenn er im Browser getestet wurde.

## Verlauf und A/B-Vergleich

Jede erfolgreiche Konvertierung erzeugt genau einen unveränderlichen Run. Der Verlauf zeigt die
zehn neuesten Runs von neu nach alt als horizontal bedienbare Karten. Jede Karte enthält:

- die fortlaufende Run-ID.
- eine echte SVG-Miniatur.
- Zielmaße, Pfadanzahl und gemessene Laufzeit.

Das Auswählen einer Karte zeigt ihr gespeichertes SVG wieder in „A · Variante“. Die aktuell
eingestellten Regler bleiben dabei unverändert. „Einstellungen übernehmen“ kopiert anschließend
die drei validierten Parameter des ausgewählten Runs in die Eingabemaske und berechnet die
Zielmaße neu. Das geladene Originalbild, der ausgewählte Run und sein angezeigtes SVG bleiben
dabei unverändert. Eine erneute Konvertierung erzeugt einen neuen Run; bei gleichem Bild und
gleichen Einstellungen ist dessen SVG byteidentisch zum Ausgangs-Run. Nach dem elften Lauf wird
nur der älteste Run aus der sichtbaren Session-History entfernt.

Unter jeder History-Karte setzen die tastaturbedienbaren Aktionen „A“ und „B“ den Run in den
jeweiligen Vergleichsplatz. Derselbe Run belegt nie beide Plätze; eine neue Zuweisung verschiebt
ihn eindeutig. Sobald A und B gesetzt sind, zeigt die gemeinsame Arbeitsfläche beide SVGs
deckungsgleich. Die Labels nennen die zugeordneten Run-IDs.

Der Regler „Überblendung“ bestimmt den sichtbaren Anteil von B:

- 0 Prozent zeigt nur A.
- 50 Prozent zeigt beide Ebenen mit halber Deckkraft.
- 100 Prozent zeigt nur B.

Beide Ebenen verwenden eine gemeinsame normalisierte ViewBox und erhalten darin die native
ViewBox des Runs seitenverhältnistreu. Deshalb bleiben auch unterschiedlich skalierte Runs
zentriert und deckungsgleich, ohne Kreisformen zu verzerren. Die aktuellen Eingabeeinstellungen
werden durch A/B-Zuweisungen nicht verändert.

Die Tabelle „Parameterunterschiede“ verwendet dasselbe kanonische Schema wie die Eingabewerte.
„Nur Unterschiede“ ist standardmäßig aktiv und zeigt ausschließlich Parameter mit verschiedenen
Werten in A und B. Ohne den Filter erscheinen Farbpräzision, Speckle-Filter und Zielgröße in
stabiler Reihenfolge mit Einheiten, gefolgt vom globalen Formerkennungsschalter und den fünf
Formtypen.

„SVG A“ und „SVG B“ laden jeweils den unveränderten SVG-Text des zugeordneten Runs herunter. Die
normalisierte Vergleichsdarstellung gelangt nicht in den Export. Dateinamen enthalten Platz und
Run-ID, beispielsweise `circle-a-run-1.svg`, damit beide Ergebnisse unterscheidbar bleiben.

## Parameter

Die numerischen Parameter wirken von der Seitenleiste über den Worker und WASM bis in den
Rust-Core:

| Parameter | Gültiger Bereich | Standard | Wirkung |
|---|---:|---:|---|
| Farbpräzision | 1–8 Bit | 7 Bit | bestimmt, wie nah beieinanderliegende Farben gruppiert werden |
| Speckle-Filter | 0–1000 px | 4 px | entfernt kleine Farbcluster |
| Zielgröße | 10–400 % | 100 % | skaliert SVG und ViewBox proportional |

Die Oberfläche bietet für die Zielgröße 25, 50, 75, 100, 150, 200 und 400 Prozent direkt an.
Nach dem Laden eines Bildes zeigt sie die daraus entstehenden Zielmaße sofort an. Ein Lauf mit
50 Prozent aus einem 256×256-Bild erzeugt beispielsweise ein SVG mit 128×128-ViewBox.

Ungültige Werte werden als typisierter Einstellungsfehler abgelehnt. Weitere Parameter werden
erst ergänzt, wenn derselbe vollständige Weg bis in die Engine getestet ist.

## Native Formen

„Native Formen“ ist standardmäßig ausgeschaltet. Kreis, Rechteck, Ellipse, Linie und Polygon sind
vorgewählt, aber bis zum Aktivieren des globalen Schalters nicht bedienbar. Danach lassen sich die
Typen einzeln ein- und ausschalten. Globaler Zustand und Typauswahl werden mit jedem Run
unveränderlich gespeichert, wiederhergestellt und im A/B-Parametervergleich angezeigt.

Bei ausgeschalteter Formerkennung ist die Ausgabe byteidentisch zur bisherigen Konvertierung.
Bei eingeschalteter Erkennung fällt jeder nicht eindeutig erkannte oder noch nicht implementierte
Typ auf den bewährten SVG-Pfad zurück.

### Native Kreise

Ist „Kreis“ als einziger Typ aktiv, erkennt die Engine kompakte, nahezu quadratische
Kreisflächen und gibt sie als `<circle>` mit Mittelpunkt, Radius, dominanter Originalfarbe und
gegebenenfalls Deckkraft aus. Der Fixture-Kreis wird als `cx="128"`, `cy="128"`, `r="64"` und
`fill="#0EA5E9"` ausgegeben. Status und History zeigen dafür „1 Kreis“ und keinen Pfad.

Die Ground-Truth-Abnahme erlaubt höchstens 2 Pixel Abweichung je Geometriewert. Intern sind
Seitenverhältnis und Flächenfüllung bewusst enger begrenzt; passt eine Kontur nicht eindeutig,
bleibt sie ein Pfad.

### Native Rechtecke

Ist „Rechteck“ aktiv, gibt die Engine kompakte, vollständig gefüllte rechteckige Cluster als
`<rect>` mit Position, Breite, Höhe, dominanter Originalfarbe und gegebenenfalls Deckkraft aus.
Das Fixture wird als `x="64"`, `y="80"`, `width="128"`, `height="96"` und `fill="#22C55E"`
ausgegeben; Status und History zeigen „1 Rechteck“ und keinen Pfad.

Die Flächenabweichung darf intern höchstens zwei Prozent betragen. Sehr schmale gefüllte Cluster
bleiben für die spätere Linienerkennung erhalten; nicht rechteckige Konturen wie das
Dreieck-Fixture fallen sicher auf einen Pfad zurück.

### Native Ellipsen

Sind „Kreis“ und „Ellipse“ aktiv, entscheidet zuerst die Ausdehnung: Nahezu gleiche Breite und
Höhe bleiben `<circle>`, eine klar unterschiedliche Ausdehnung mit elliptischer Flächenfüllung
wird `<ellipse>`. Das Ellipsen-Fixture erzeugt `cx="128"`, `cy="128"`, `rx="80"`, `ry="48"`
und `fill="#8B5CF6"`; Status und History zeigen „1 Ellipse“ und keinen Pfad.

Ellipse und Kreis verwenden dieselbe konservative Flächentoleranz. Die maximal drei Prozent
Seitenverhältnisabweichung des Kreises sind zugleich die eindeutige Typgrenze: Eine Ellipse muss
außerhalb dieser Grenze liegen. Zusätzlich darf ihre Pixelbelegung höchstens acht Prozent von
der idealen Ellipsenfläche abweichen; dadurch bleibt eine unregelmäßige Kontur trotz ähnlicher
Gesamtfläche ein Pfad.

### Native Linien

Ist „Linie“ aktiv, erkennt die Engine stark längliche, vollständig gefüllte horizontale und
vertikale Cluster. Das Fixture wird als `<line>` von `x1="48"`, `y1="128"` nach `x2="208"`,
`y2="128"` mit `stroke-width="12"` und `stroke="#F97316"` ausgegeben. Status und History zeigen
„1 Linie“ und keinen Pfad.

Die längere Seite muss mindestens viermal so groß wie die kürzere sein; die Fläche darf höchstens
zwei Prozent vom Begrenzungsrahmen abweichen. Dadurch bleiben kompakte Formen Pfade und normale
Rechtecke Rechtecke.

### Native Polygone

Ist „Polygon“ aktiv, erkennt die Engine aktuell gefüllte aufrechte Dreiecke mit drei geraden
Kanten. Das Fixture erzeugt `<polygon points="127.5,48 216,207 40,207">` und
`fill="#EC4899"`. Alle Punkte liegen innerhalb der 2-Pixel-Manifesttoleranz; Status und History
zeigen „1 Polygon“ und keinen Pfad.

Ein typisiertes Vereinfachungs-Epsilon erlaubt pro linker und rechter Kante höchstens 2 Pixel
Abweichung von der idealen Geraden. Zusätzlich darf die Clusterfläche höchstens acht Prozent von
der Dreiecksfläche abweichen. Eine gekrümmte oder komplexe Kontur bleibt dadurch ein Pfad.

### Gemischte Szenen

Sind alle Formtypen aktiv, gibt die Engine native Elemente in der kanonischen Reihenfolge Kreis,
Rechteck, Ellipse, Linie und Polygon aus. Jedes Cluster erzeugt genau ein Element. Das
Mixed-Fixture enthält Kreis, Rechteck, Linie und Dreieck und erscheint deshalb als `<circle>`,
`<rect>`, `<line>` und `<polygon>` ohne zusätzlichen Pfad. Status und History zählen jede Form
genau einmal. Eine wiederholte Konvertierung erzeugt dasselbe SVG byteidentisch.

## KI-Manager

KI-Modelle werden nicht automatisch geladen. Der KI-Manager zeigt pro Modell:

- Name, Aufgabe, Größe und Lizenz.
- Zustand: nicht geladen, Download, Initialisierung, bereit oder Fehler.
- echten Downloadfortschritt.
- verwendetes Backend, beispielsweise WebGPU oder WASM.
- Aktionen zum Laden, Wiederholen und Entladen.

Die validierte Registry legt MODNet Portrait Matting mit 24,69 MiB für Hintergrundentfernung und
SlimSAM 77 Uniform mit 19,76 MiB für Smart Select fest. Beide Modelle und ihre Ursprungsprojekte
stehen unter Apache-2.0. MODNet ist für WebGPU mit WASM-Fallback vorgesehen; SlimSAM verwendet
zwei FP16-Graphen über WebGPU. Revision, Einzeldateien und Prüfsummen sind im
Drittanbieter-Inventar festgehalten.

Entladen muss Modell-Session, GPU-/WASM-Ressourcen und zugehörige Caches tatsächlich
freigeben. MODNet für Hintergrundentfernung wird als erstes reales Modell integriert; SAM
Smart Select folgt danach innerhalb des Einreichungsumfangs.

## WebMCP

In einem unterstützten Browser kann ein Agent dieselben sichtbaren Anwendungsdienste verwenden
wie ein Mensch. Auf `https://studio.img2.download` bestätigt der Nutzer die lokale Dateiübergabe.
Danach kann der Agent Einstellungen und Workspace lesen, konvertieren, History und A/B bedienen,
SVG exportieren sowie KI-Modelle und KI-Aktionen steuern. Jede Aktion bleibt unmittelbar in der
Oberfläche sichtbar.

Der bestehende Vorgänger auf `https://img2.download` erhält einen getrennten WebMCP-Adapter für
seinen eigenen sichtbaren Converter-Ablauf.

WebMCP ist eine progressive Erweiterung. Ohne WebMCP bleibt die gesamte UI bedienbar.

## Formerkennungs-Fixtures

Die Ground-Truth-Bilder unter `fixtures/shape-recognition` prüfen Kreis, Ellipse, Rechteck,
Linie, Polygon und eine gemischte Szene. Der Basistest beweist byteidentisches Abschalten und
sicheren Pfad-Fallback. Die Einzelabnahmen aller fünf Formtypen und die Mixed-Abnahme lesen das
gemeinsame Manifest. Sie prüfen Elementtyp, Farbe, Statistik, Reihenfolge und jeden Geometriewert
innerhalb der dort definierten 2-Pixel-Toleranz.

## Datenschutz

- Bildverarbeitung bleibt lokal im Browser.
- Die App verwendet lokale Fonts und verzichtet auf Telemetrie und Tracker.
- KI-Modellzugriffe beginnen nach sichtbarer Nutzeraktion.

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

Jede Funktion wird vor ihrer Aufnahme in dieses Handbuch direkt im echten Google Chrome
abgenommen. Automatisierte Tests allein reichen nicht. Ein dabei erkannter Mangel hält den Task
offen, erhält einen Regressionstest und wird erneut geprüft; erst danach werden Task und
Handbuch abgeschlossen.
