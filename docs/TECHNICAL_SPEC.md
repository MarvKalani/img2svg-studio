# Technische Spezifikation

## 1. Architektur

Das Repository wird als Rust-Workspace mit separater Web-Anwendung aufgebaut:

- `img2svg-core`: deterministische, plattformunabhängige Engine ohne Browserabhängigkeit.
- `img2svg-wasm`: schmale `wasm-bindgen`-Schnittstelle und serialisierbare Resultate.
- `web`: Vite + TypeScript 7.0.2 ohne schweres UI-Framework; UI, Canvas, Worker, History,
  SVG-Export, Modellverwaltung und WebMCP.

Die Engine kennt keine DOM- oder Dateiauswahl. Die Web-App kennt keine Tracing-Details.

TypeScript `7.0.2` läuft als stabiler nativer Compiler. Alle drei Projekte verwenden explizite
ESM-, Typ- und Standardbibliotheksgrenzen; der MCP aktiviert zusätzlich `isolatedDeclarations`,
damit öffentliche Deklarationen dateiweise erzeugt werden können. Die automatische
TS-7-Parallelisierung bleibt aktiv, weil sie im lokalen M4-Benchmark schneller als feste Checker-
oder Builderzahlen war. Gründe, Messwerte und Regeln für auffällig explizite Exporttypen stehen in
[`TYPESCRIPT_7.md`](TYPESCRIPT_7.md).

`i18n/localization.ts` kapselt die zweisprachige Präsentationsschicht. Eine kanonische deutsche
Quellphrase besitzt genau eine englische Entsprechung; typisierte Regeln formatieren variable
Zähler und Run-Zustände. Ein einzelner `MutationObserver` lokalisiert auch DOM-Ausgaben der
bestehenden Controller und bewahrt deren deutsche Quelle für den verlustfreien Sprachwechsel.
Die Sprachpräferenz, drei Layoutmodi, benannte Conversion-Presets und das einmal gemessene
Hardwareprofil liegen unter getrennten Schlüsseln in `localStorage`; Conversion-Runs und
SVG-Ausgabe bleiben flüchtig. UI und WebMCP teilen sich denselben validierten Preset-Store.

`release/app-version.ts` hält die sichtbare Produktversion an einer Stelle. Das Format
`YYMMDD.RR` verbindet das Veröffentlichungsdatum mit einer zweistelligen Tagesrevision und wird
beim Start in den Seitenfuß sowie als `data-app-version` am Wurzeldokument geschrieben. Vite nutzt
dieselbe Konstante für alle Haupt- und Worker-Assets im Dateimuster
`[name]-vYYMMDD.RR-[hash]`; die Service-Worker-Registrierung übergibt sie als Updateparameter.

`public/impressum.html`, `public/datenschutz.html` und `public/licenses.html` sind eigenständige
statische Dokumente mit Canonical-URL, gemeinsamer `legal.css` und progressiver Sprachumschaltung
über `legal.js`. Der deutsche Inhalt bleibt ohne JavaScript lesbar. Die Umschaltung verwendet nur
die bereits vorhandene Präferenz `img2svg-language`; rechtliche Inhalte werden nicht dynamisch
nachgeladen. `robots.txt` und `sitemap.xml` machen Start- und Rechteseiten auffindbar.

Ein getrennter ChatGPT-Companion ergänzt diese Architektur über einen stateless Node/TypeScript-
MCP-Server. Er dekodiert eine explizit übergebene Datei, verwendet denselben kompilierten Rust/WASM-
Kern und liefert SVG plus Statistiken. Ein Tauri-Adapter kann später denselben Rust-Core nativ
aufrufen; die Plattformpfade sind in [`APPS_SDK.md`](APPS_SDK.md) abgegrenzt.

## 2. Datenfluss

```text
Datei / Drop / PWA Share Target / Desktop File Handler
  → Browser-Decoder
  → unveränderliches Original-RGBA
  → proportionale Rastergröße und optionale Detail- und Farbfilter
  → optional angewendete KI-Maske
  → RGBA + validierte ConversionOptions an WASM-Worker
  → Clustering und Tracing
  → optionale Erkennung ausgewählter Formen
  → deterministische SVG-Assembly
  → ConversionResult { svg, stats, warnings }
  → History / Anzeige / Export / A-B
```

CPU-intensive WASM-Aufrufe laufen in einem Web Worker, damit die Bedienoberfläche während der
Konvertierung reaktionsfähig bleibt.

Share Target und Desktop-Dateihandler enden beide in `ImageLoaderController.loadOriginal`. Der
Service Worker fängt nur `POST /share-target` und den einmaligen Leseweg unter
`/__shared-image/` ab. Er legt den Bild-Response unter einem zufälligen Token in einem eigenen
versionierten Cache ab und löscht ihn beim ersten Lesen. Die App-Shell und Modellartefakte werden
nicht von diesem Worker gecacht. Eine fehlgeschlagene Registrierung lässt den normalen Tab
unverändert bedienbar.

Cloudflare revalidiert HTML und `/assets/*` mit `Cache-Control: no-cache`. Auch versionierte
Lazy-Assets werden validiert, weil ein noch nicht an allen Custom-Domain-Knoten verfügbarer Worker
sonst als erfolgreicher HTML-SPA-Fallback zwischengespeichert werden kann. Versionsnummer und
Inhaltshash im Dateinamen verhindern weiterhin alte Antworten nach einem Release. Der
Share-Bridge-Cache verwendet die übergebene Produktversion als Namespace; beim Aktivieren entfernt
der Worker ältere Namespaces.

## 3. Zentrale Domänenmodelle

Der implementierte `ConversionOptions`-Kern enthält typisierte Rastervorbereitung, Farbpräzision
1–8 Bit, Speckle-Filter 0–1000, Pfadpräzision 0–4 Stellen und proportionale SVG-Zielgröße
10–400 Prozent. Die
Rastervorbereitung unterscheidet Original, Prozent und feste Zielhöhe sowie Farbe, Graustufen und
Schwarzweiß. Ein Detailmodus wählt Aus, 3×3-Gaußglättung oder milde Unscharfmaske. Rust kapselt
Enginewerte in `ConversionOptions::try_new`; TypeScript erzeugt den
vollständigen Vertrag ausschließlich über `createConversionOptions`. Grenztests halten beide
Seiten synchron.

`ShapeDetectionOptions` ergänzt einen globalen Schalter und die typisierten Formtypen Kreis,
Rechteck, Ellipse, Linie und Polygon. Standardmäßig ist die Kette ausgeschaltet, während alle
Typen vorgewählt sind. TypeScript erzeugt die Typauswahl aus `nativeShapeSchema`; Rust prüft die
aktivierten Typen in derselben stabilen Reihenfolge. Alle fünf Einzeldetektoren sind implementiert;
nicht eindeutig erkannte Konturen bleiben Pfade.

Eine kanonische Schemaquelle erzeugt oder speist:

- Rust-Validierung.
- TypeScript-Typen und Standardwerte.
- UI-Metadaten.
- History-Diff.
- WebMCP-Inputschema.

Der Rust-`ConversionResult` enthält den SVG-String und typisierte Shape-Zählungen. Die Web-App
ergänzt aus validiertem SVG, Eingabe und Laufzeitmessung die Zielmaße sowie Pfad- und alle fünf
Shape-Anzahlen und den unveränderlichen Options-Snapshot des History-Runs.

Der aktuelle `historyStore` speichert pro erfolgreichem Lauf SVG, kopierten Options-Snapshot,
Dateiname, Zielmaße, Pfad- und alle fünf Shape-Anzahlen sowie Laufzeit. Run, Options-Snapshot und
zurückgegebene Listenkopie werden eingefroren. IDs sind innerhalb der Sitzung monoton steigend.
Der Store hält alle Einträge der aktuellen Bild-Session in Reihenfolge neu nach alt und verwaltet
die ausgewählte Run-ID getrennt vom aktuellen Eingabeformular. Die Einträge bleiben bis zum
gezielten Löschen oder zum Laden eines anderen Originals erhalten. `remove` gibt den entfernten Run
zurück und bereinigt dessen Auswahlzustand.

`createLogoDemoOptions` ist die typisierte Quelle des sichtbaren Jury-Profils: Farbe mit
Glättungs- und Schärfungsstärke null, Original-Rastergröße, 6 Bit Farbpräzision, 16 Pixel Speckle, 0 Stellen
Pfadpräzision, 100 Prozent SVG-Skalierung und ausschließlich Polygonerkennung. Nur der erfolgreiche
gebündelte Logo-Ladevorgang wendet dieses Profil an; alle
anderen Bildwege behalten die vom Nutzer gesetzten Optionen.

## 4. Engine-Module

Der Core trennt Pipeline und Formerkennung, damit beide Quellen unter 1000 Zeilen bleiben:

```text
lib.rs               Konfiguration, Pipeline, Fehler und Pfad-Fallback
shape_detection.rs   Typen, Detektorreihenfolge, native SVG-Elemente und Statistik
visioncortex_shape.rs schmaler Adapter für bestätigte Visioncortex-Evidenz
```

`visioncortex` wird als Abhängigkeit verwendet, nicht kopiert. Herkunft, Version und Lizenz
werden dokumentiert. Übernommene oder adaptierte Algorithmen erhalten konkrete Hinweise.

Der kompatible Basiskontrakt lautet
`convert_rgba(rgba, width, height) -> Result<String, ConversionError>`. Die erweiterte
Engine-Grenze `convert_rgba_with_options_result` liefert `ConversionResult` mit SVG und
typisierten Shape-Zählungen. Sie validiert positive
Maße und die exakte RGBA-Länge, verwendet für vollständig transparente Pixel einen
deterministisch gewählten unbenutzten RGB-Schlüssel aus dem gesamten 24-Bit-Farbraum und
assembliert SVG- und Pfadattribute in stabiler Reihenfolge. Falls ein synthetisches Bild tatsächlich
alle RGB-Farben sichtbar verwendet, reserviert der Core eine Schlüsselfarbe durch eine minimale
Änderung genau dieser sichtbaren Farbe, statt das Canvas-Bild abzulehnen. Der numerische Fehlercode
für einen nicht verfügbaren Transparenzschlüssel bleibt ausschließlich zur ABI-Kompatibilität
reserviert und wird von diesem Pfad nicht mehr ausgegeben. Die WASM-Grenze akzeptiert
`Uint8Array`, zwei `u32`-Maße, die zehn
VTracer-Werte als validierte Zahlen beziehungsweise Enum-Codes, die SVG-Skalierung und ein
`u32`-Bitfeld für globalen Formerkennungszustand und Typauswahl.
Sie liefert den SVG-String oder einen der stabilen numerischen Fehlercodes 1–4.
Die Fortschrittsvariante derselben schmalen Grenze meldet über einen Callback typisierte Phasen:
Der inkrementelle Visioncortex-Builder liefert für die Clusterbildung Werte von 0 bis 100; beim
Tracing meldet der Core verarbeitete und gesamte Farbflächen. Höchstens 100 Zwischenstände pro
Phase überqueren die WASM-Grenze, der letzte native Wert wird immer übertragen. Der Worker reicht
diese Meldungen nur an die aktuell angeforderte Preview-Revision weiter. Das Ergebnis bleibt der
SVG-String; die Web-App liest sichtbare Elementzählungen daraus und speichert sie mit dem Run.

Der Kreisdetektor wertet pro Cluster dessen Begrenzungsrahmen und Pixelanzahl aus. Maximal drei
Prozent Seitenverhältnisabweichung und acht Prozent Abweichung von der erwarteten Kreisfläche
begrenzen False Positives. Die Geometrie folgt deterministisch aus dem Begrenzungsrahmen; eine
`BTreeMap` bestimmt die dominante Original-RGBA-Farbe unabhängig von Hash-Reihenfolgen. Eine
nicht erfüllte Bedingung führt ohne Teilresultat zum vorhandenen Pfad zurück. Erst nach diesen
billigen Prüfungen bildet `visioncortex_shape.rs` aus dem Cluster eine zugeschnittene
`BinaryImage`; `Shape::is_circle()` bestätigt dessen tatsächliche Pixelbelegung. Dadurch bleibt
ein hohler 32×32-Ring mit nur 4,5 Prozent Kreisflächenabweichung ein Pfad. Der Test liest PNG und
Sollwerte direkt aus dem gemeinsamen Fixture-Manifest und erlaubt die dort festgelegten zwei
Pixel Geometrietoleranz.

### Visioncortex-Shape-Audit

VTracer 0.6.5 verwendet Visioncortex zum Tracing, ruft dessen vorhandene Shape-Klassifikatoren
aber nicht auf. Da `visioncortex` 0.8.10 bereits direkt und exakt gepinnt ist, wird kein Quellcode
kopiert und kein eigener VTracer-Fork gepflegt. Ein Referenztest hält das Verhalten der vier
öffentlichen Methoden in der Reihenfolge Kreis, Ellipse, Viereck und gleichschenkliges Dreieck
fest:

| Ground Truth | `is_circle` | `is_ellipse` | `is_quadrilateral` | `is_isosceles_triangle` |
| --- | ---: | ---: | ---: | ---: |
| Kreis | ja | ja | nein | nein |
| Ellipse | nein | ja | nein | nein |
| Rechteck | nein | nein | nein | nein |
| Dreieck | nein | nein | ja | ja |

`is_circle` liefert als zusätzliche Occupancy-Prüfung einen nachgewiesenen Nutzen und wird im
Produktadapter verwendet. `is_ellipse` dupliziert die bereits strengere lokale Belegungsprüfung.
`is_quadrilateral` lehnt das ideale Rechteck ab und klassifiziert das Dreieck als Viereck.
`is_isosceles_triangle` erkennt das Fixture, liefert jedoch keine benötigten Eckpunkte und ist
gegenüber der lokalen Kanten- und Flächenprüfung redundant. Diese drei Methoden bleiben daher
nur vermessene Referenz und gelangen nicht in den Laufzeitpfad.

Der lokale Debug-Referenzlauf auf Apple Silicon benötigte für 160 Klassifikationen 0,66 Sekunden;
der Regressionstest setzt ein bewusst großzügiges Fünf-Sekunden-Budget. Der Produktpfad erzeugt
die zusätzliche Binärmaske nur für Kandidaten, die bereits Kreis-Seitenverhältnis und -Fläche
erfüllen.

Der Rechteckdetektor fordert höchstens zwei Prozent Abweichung zwischen Cluster- und
Begrenzungsrahmenfläche. Ein Verhältnis der kürzeren zur längeren Seite unter 0,1 wird bewusst
abgelehnt, damit linienartige Cluster dem späteren Liniendetektor vorbehalten bleiben. Position
und Maße folgen direkt aus dem Begrenzungsrahmen; Farbe, Deckkraft, Skalierung und Zahlenformat
verwenden dieselben deterministischen Hilfen wie der Kreis.

Der Ellipsendetektor verwendet dieselbe maximale Flächenabweichung von acht Prozent wie der
Kreisdetektor. Er akzeptiert ausschließlich Seitenverhältnisse außerhalb der
Drei-Prozent-Kreisgrenze. Bei gemeinsam aktivierten Detektoren bleibt die stabile Reihenfolge
Kreis vor Ellipse; damit besitzt die Typgrenze genau eine Ausgabe. Eine zusätzliche
Belegungsprüfung vergleicht jedes Clusterpixel deterministisch mit der idealen Ellipse im
Begrenzungsrahmen und erlaubt höchstens acht Prozent Abweichung. So reichen ähnliche Gesamtfläche
und Ausdehnung einer Freiformkontur nicht für eine native Klassifizierung.

Der Liniendetektor übernimmt horizontale oder vertikale Cluster ab einem Verhältnis von 4:1 und
höchstens zwei Prozent Abweichung von der vollständig gefüllten Begrenzungsrahmenfläche. Die
kürzere Seite wird zur Strichbreite, die Mittellinie der längeren Achse zu den Endpunkten. Sehr
schmale Cluster sind zuvor ausdrücklich vom Rechteckdetektor ausgeschlossen. Transparenz wird als
`stroke-opacity` ausgegeben; Skalierung und Zahlenformat bleiben mit den gefüllten Formen
identisch.

Der Polygon-Detektor leitet für das aktuelle Dreiecksprofil aus jeder belegten Bildzeile die
linke und rechte Kante ab. `PolygonSimplificationEpsilon` kapselt die zulässige Abweichung von
2 Pixeln zur jeweiligen idealen Geraden. Die Clusterfläche darf höchstens acht Prozent von der
abgeleiteten Dreiecksfläche abweichen. Gekrümmte oder komplexe Konturen überschreiten mindestens
eine dieser Grenzen und bleiben Pfade. Die ausgegebene Punktreihenfolge ist Spitze, rechts unten,
links unten. Kantenabweichungen werden an Pixelzentren gemessen, damit dasselbe Epsilon an beiden
Rastergrenzen symmetrisch gilt.

Die SVG-Assembly sortiert erkannte native Elemente kanonisch als Kreis, Rechteck, Ellipse, Linie
und Polygon. Mehrere Elemente desselben Typs behalten ihre stabile Clusterreihenfolge;
Pfad-Fallbacks folgen ebenfalls stabil. Da `detect_native_shape` pro Cluster beim ersten
passenden Detektor endet, kann kein Cluster doppelt ausgegeben oder gezählt werden. Der
Mixed-Fixture-Test prüft Geometrie, Farbe, Statistik, Reihenfolge und zwei byteidentische Läufe.

`visioncortex` 0.8.10 und `wasm-bindgen` 0.2.126 sind exakt gepinnt; beide stehen unter
MIT oder Apache-2.0. Das eigene Projekt steht davon getrennt gemäß D-009 unter BSL 1.1 und
wechselt spätestens am 20. Juli 2030 zu Apache-2.0.
Die Test-only-Abhängigkeiten `png` 0.18.1, `serde` 1.0.229 und `serde_json` 1.0.150 sind ebenfalls
exakt gepinnt und gelangen nicht in das produktive WASM.

## 5. Determinismus

- Stabile Reihenfolge für Cluster, Konturen, Attribute und Statistiken.
- Keine iteration-order-abhängigen Hashmaps in serialisierter Ausgabe.
- Kanonische Zahlen- und Farbformatierung.
- Feste Rundungsregeln, keine locale-abhängige Ausgabe.
- Fixtures testen zwei identische Runs auf String-Gleichheit.
- Build-Metadaten dürfen nicht ungefragt in den SVG-String gelangen.

## 6. Web-Anwendung

Der erste ausführbare Slice verwendet Vite 8.1.5, TypeScript 7.0.2 und frameworkfreies
semantisches HTML/CSS. `web/index.html` enthält die sichtbaren Landmarks und
`web/src/styles.css` die responsive Darstellung.

`web/src/image/decode-image.ts` validiert PNG, JPEG und WebP bis 25 MB und dekodiert über
`createImageBitmap`. Der Browser-Port erzeugt erst nach erfolgreicher Dekodierung eine lokale
Objekt-URL. `image-loader.ts` verbindet Dateiauswahl und Drop mit derselben Funktion, ersetzt
die sichtbare Vorschau atomar und gibt die vorherige Objekt-URL beim nächsten gültigen Bild
oder vor dem Verlassen über den kleinen `imageStore` frei.

`conversionService` berechnet aus Prozent oder Zielhöhe proportionale Rastermaße, skaliert über
ein kurzlebiges Canvas und wendet danach optional eine deterministische 3×3-Gaußglättung oder
milde Unscharfmaske sowie den gewählten RGB-Filter an. Der Alphakanal bleibt
unverändert. Erst dieser Buffer wird ohne Kopie an einen dedizierten Worker übertragen. Der Worker
initialisiert das generierte WASM, ruft den Rust-Core auf und wird nach genau einem Ergebnis
beendet. Der Conversion-Controller entprellt Optionsänderungen um 120 Millisekunden, serialisiert
gleichzeitige Anforderungen und verwirft Ergebnisse älterer Revisionsstände. Ein `AbortController`
terminiert den Worker bei ausdrücklichem Abbruch oder sobald eine neuere Revision den Lauf ersetzt.
UI und WebMCP verwenden dafür denselben Controllerpfad. Der Abbruch besitzt einen typisierten
Fehlercode und einen sichtbaren Neustartpfad. Der Controller validiert das
zurückgegebene XML als SVG, bevor es die Rastervorschau ersetzt. Die Vorschau enthält bereits den
vollständigen typisierten Run-Kandidaten, bleibt jedoch flüchtig. Erst die explizite Übernahme
reicht diesen Kandidaten an den History-Store weiter. Die TypeScript-Domäne ergänzt
die Enginecodes um `WorkerFailed` und `InvalidSvg`; `ConversionFailure` ordnet jedem Code genau
eine verständliche UI-Meldung zu.

Farbpräzision setzt den Bitverlust der `visioncortex`-Farbnähe. Der Speckle-Wert wird wie im
Tracing-Fundament zu einer Mindestfläche quadriert und vor der SVG-Assembly nochmals explizit
angewendet. Die Pfadpräzision wird an `to_svg_string` weitergereicht und bestimmt ausschließlich
die Dezimalstellen der Pfadkoordinaten. Die Zielgröße skaliert den bereits vektorisierten Pfad
deterministisch und berechnet
positive ganzzahlige Zielmaße mit derselben Rundungsregel in Rust und TypeScript.

Der SVG-Download serialisiert das aktuell gerenderte `svg`-Element mit `XMLSerializer`. Dadurch
entsprechen die Blob-Bytes exakt demselben DOM-Zustand, den der Nutzer sieht. Der Downloadname
wird ausschließlich aus dem Namen des aktuell geladenen Bildes abgeleitet.

Die UI verwendet kleine Feature-Module und zentrale Application Services:

- `imageService`: Laden, Dekodieren, Transformation und Größenänderung.
- `conversionService`: Rastervorbereitung, Worker und WASM-Lebenszyklus.
- `settingsStore`: validierte Einstellungen.
- `historyStore`: ausschließlich unveränderliche angenommene Runs.
- `exportService`: bytegenauer SVG-Download.
- `modelRegistry`: Zustandsautomat und deduplizierte Modell-Ladevorgänge.
- `webMcpAdapter`: Tool-Registrierung und Mapping auf dieselben Services.
- `contextMenuController`: DOM-Grenze für typisierte Quellen- und Parameterkommandos.
- `layoutPreferences`: validierte, persistente Standard-/Dock-/Einklappmodi.
- `hardwareProfile`: einmaliger kurzer Rasterbenchmark und persistente Startskalierung.
- `workspacePreviewSettings`: rein lokale Zielgröße und Farbe für die Darstellung des aktuellen SVG.

Der sichtbare UI-Zustand wird aus diesen Stores gerendert. WebMCP besitzt keinen zweiten,
abweichenden Schattenzustand.

`contextMenuController` hält keinen eigenen Anwendungszustand. Es liest die aktuelle
`compareSelection`, validiert `data-option-key` gegen `ConversionOptionKey` und ruft ausschließlich
bestehende Controller auf. `conversionOptionsController.reset` schreibt genau den kanonischen
Default des gewählten Parameters und löst denselben Preview-Listener wie eine manuelle Änderung
aus. Handbuchthemen werden über `InteractiveHandbookController.showTopic` geöffnet.

`historyController` rendert Rasteroriginal, die optionale aktuelle verarbeitete Rasterversion,
einen optionalen ungespeicherten Entwurf und alle Run-Karten der aktuellen Bild-Session. Raster und
Entwurf bleiben bewusst außerhalb des `historyStore`; der verarbeitete Blob gehört dem
`imageStore`. Der Entwurf wird bei der Übernahme durch den neuen Run ersetzt; die verarbeitete
Rasterversion bleibt bis zur nächsten Rasterbearbeitung verfügbar. Ein neues Original startet
eine leere Run-History; KI-Versionen behalten dieselbe Originalquelle. Das Löschen eines ausgewählten Runs
wählt das Original; das Löschen einer A/B-Quelle leert den Vergleich. Der Controller schreibt
keine alten Optionen in das Formular. `restoreSelectedRunOptions` validiert den ausgewählten
Snapshot erneut und reicht eine Kopie an `conversionOptionsController.apply` weiter. Dieser
explizite Pfad schreibt numerische
Werte, globalen Formerkennungszustand und Typauswahl und rendert die abgeleiteten Zielmaße neu;
Store, SVG und Bildzustand bleiben unverändert.

`compareSelection` hält je eine typisierte Original-, Verarbeitet-, Entwurfs- oder Run-Quelle für A
und B. Die Zuweisung derselben Quelle in den anderen Platz entfernt sie aus dem bisherigen Platz.
`compareController` rendert erst bei zwei vollständigen Plätzen. Beide Quellen verwenden denselben proportionalen
Canvas. Zwei feste Clip-Fenster zeigen A links und B rechts; der direkt ziehbare Trenner und der
Tastatur-Regler verändern dieselbe Prozentposition. `viewportController` transformiert nur die
Inhalte hinter den Clip-Fenstern und projiziert Skalierung und Pixelversatz identisch auf beide
Layer. Tasten, Mausrad, Pointer-Drag, Zwei-Pointer-Pinch und Pfeiltasten verwenden denselben
Zoom-/Pan-Kern; jede neue A/B-Kombination startet bei 100 Prozent und zentrierter Position.
Der Entwurf besitzt dabei den stabilen Quellschlüssel `draft`: Eine neue Berechnung ersetzt dessen
SVG-DOM, ohne Viewport oder Trenner anzutasten. Auch der parameterspezifische Wechsel von einem Run
zum neuen Entwurf verwendet diesen expliziten Ersatzpfad; manuelle A/B-Zuweisungen setzen den
Viewport zurück. `workspacePreviewSettings` beobachtet ausschließlich das bereits gerenderte SVG,
klont es in eine gewählte Pixelbox und schreibt die validierte Ansichtsfarbe als CSS-Variable.
Diese Ansicht besitzt keinen Rückkanal in Bild-, Optionen- oder History-Stores.

`compareConversionSettings` projiziert beide Options-Snapshots über eine typisierte, stabile
Schemafolge in formatierte Tabellenzeilen. Der standardmäßig aktive Differenzfilter vergleicht
vor der Formatierung numerische Werte und boolesche Formerkennungswerte. A/B-Downloads übergeben
den ursprünglichen `ConversionRun.svg`-String direkt an `downloadSvgFile`; die normalisierten
DOM-Layer werden nie serialisiert oder exportiert.

### Qualitätsgate

`npm run check` im Repository-Root ist der einzige vollständige lokale Gate. Er führt `oxfmt`,
`oxlint`, die ausführbare 1000-Zeilen-Prüfung, beide TypeScript-Projekte, schnelle Vitest-Suiten
und den Produktionsbuild aus. Für den vorhandenen Rust-Workspace folgen `cargo fmt --check`
und Clippy mit als Fehler behandelten Warnungen. `.github/workflows/check.yml` installiert das
committete Lockfile und ruft denselben Befehl auf.

## 7. WebMCP-Integration

WebMCP ist im Juli 2026 ein Entwurf und eine progressive Browserfunktion. Die Integration
verwendet Feature Detection und die aktuelle `document.modelContext`-Schnittstelle hinter
einem Adapter. Die veraltete `navigator.modelContext`-Variante wird nicht fest eingebaut.

Die komplexen Konvertierungsaktionen verwenden die imperative API. Deklarative Annotationen
können ergänzend für stabile Standardformulare eingesetzt werden, dürfen aber keine doppelte
Geschäftslogik erzeugen.

Der Adapter registriert `get_capabilities`, `configure_conversion`, `convert_current_image`,
Workspace-Zustand, History, A/B-Auswahl einschließlich Original- und verarbeitetem Raster, Export,
KI-Modellverwaltung und beide KI-Aktionen. Eine
typisierte und getestete Capability Map ordnet jedes sichtbare Application Command genau einem
UI- und einem WebMCP-Einstieg zu. Smart Select nimmt normierte Koordinaten von 0 bis 1 an und
führt dieselben akkumulierten Maskenverfeinerungen wie die Pointer-Oberfläche aus.
`configure_conversion` setzt Glättungs- und Schärfungsstärke unabhängig im Bereich 0 bis 100;
Workspace- und Run-Antworten nennen die jeweilige exakte Bytegröße.
Jedes Tool besitzt:

- einen stabilen, aktionsorientierten Namen.
- eine eindeutige Beschreibung ohne Inhalte aus Nutzerbildern.
- ein enges JSON-Schema mit Bereichsvalidierung.
- strukturierte Erfolgs- und Fehlerresultate.
- passende Hinweise für nur lesende und zustandsändernde Aktionen, soweit unterstützt.

Lokale Entwicklung und Abnahme verwenden Chrome 149 oder neuer mit
`chrome://flags/#enable-webmcp-testing`. Für die sichtbare Kontrolle registrierter Tools und
Aufrufe wird zusätzlich `chrome://flags/#devtools-webmcp-support` aktiviert. WebMCP benötigt
einen sichtbaren Tab, einen origin-isolierten Dokumentkontext und die `tools` Permissions
Policy. Die Abnahme prüft die Werkzeuge nicht nur gegen API-Fakes, sondern ruft sie über den
verbundenen Chrome-Agenten auf und kontrolliert dieselbe sichtbare UI.

Die produktive Abnahme des neuen Studios läuft auf `https://studio.img2.download`. Die
Hosting-Konfiguration sendet für das App-Dokument `Origin-Agent-Cluster: ?1` und
`Permissions-Policy: tools=(self)`. Ein Production-Smoke-Test prüft Header, Tool-Inventar und
den sichtbaren Ende-zu-Ende-Ablauf im Ziel-Chrome. Lokale Bilder werden über die
browserbestätigte Dateiübergabe in den aktiven Tab übernommen; alle folgenden Produktaktionen
laufen über dieselben Application Services.

Der bestehende Vorgänger auf `https://img2.download` bleibt eine getrennte Anwendung. Sein
WebMCP-Adapter lebt als kleine Integration mit eigenem Capability-Inventar und eigenem
Production-Smoke-Test. Dadurch wird keine DOM- oder Zustandslogik zwischen Vorgänger und
img2svg Studio vermischt. Der am 19. Juli 2026 auditierte Produktionsstand verwendet noch
`navigator.modelContext` und liefert beide Freigabeheader nicht. Der Ersatz unter
`integrations/img2-download` verwendet die aktuelle API, entfernt den nicht sichtbaren URL-Fetch
und ordnet elf vorhandene Converter-Kommandos eindeutig zu. Er ist im lokalen Vorgänger-Repository
mit `e386756` übernommen; `e739a54` ergänzt den reproduzierbaren statischen `dist`-Build. Beide
Commits sind aus einem frischen Checkout sowie gegen den erzeugten Output in Chrome 150 abgenommen.
Produktiv fehlen noch GitHub-Push, Cloudflare-Deployment und dieselbe Abnahme auf der öffentlichen
Domain.

Primärquellen:

- <https://developer.chrome.com/docs/ai/webmcp>
- <https://developer.chrome.com/docs/ai/webmcp/imperative-api>
- <https://developer.chrome.com/docs/ai/webmcp/secure-tools>
- <https://developer.chrome.com/blog/new-in-devtools-149>

### Optionaler ChatGPT-Companion

WebMCP bleibt die primäre Agentenschnittstelle des sichtbaren, lokalen Studios. Der getrennte
ChatGPT-Companion ergänzt diesen Weg, ersetzt ihn aber nicht und ist keine Voraussetzung für den
Browserbetrieb.

Der Companion verwendet einen Streamable-HTTP-MCP-Server und eine UI im ChatGPT-iframe über die
MCP Apps Bridge. Für Developer Mode erreicht ChatGPT den lokalen Server bevorzugt über OpenAI
Secure MCP Tunnel; temporäres öffentliches HTTPS bleibt eine Alternative. Dauerhaftes Hosting ist
nur für eine unabhängig verfügbare ChatGPT-App sinnvoll. Tunnel-, Hosting- und
Datei-/Datenschutzfluss werden getrennt vom statischen Browser-Studio getestet und dokumentiert.
Beide Wege teilen den Rust-Konvertierungskern und typisierte Verträge, nicht den flüchtigen
Browserzustand.

Die Companion-Bildbearbeitung verwendet keine Bildschirmkoordinaten. `analyze_image` dekodiert
das Originalraster, bildet deterministische vierfach verbundene Randregionen und gibt deren
Saatpunkte normiert von 0 bis 1 zusammen mit einer beschrifteten PNG-Vorschau zurück.
`remove_background_region` berechnet dieselbe Maske stateless erneut und setzt ausschließlich die
Alpha-Kanäle der Auswahl auf null. Das resultierende PNG ist dadurch eine direkt prüf- und
vektorisierbare Toolausgabe, ohne serverseitige Sitzung oder versteckten Zwischenzustand.

Primärquellen:

- <https://developers.openai.com/apps-sdk/build/mcp-server>
- <https://developers.openai.com/apps-sdk/build/chatgpt-ui>
- <https://developers.openai.com/apps-sdk/deploy>
- <https://developers.openai.com/api/docs/guides/secure-mcp-tunnels>

## 8. KI-Modelle

`web/src/ai/model-manifest.ts` ist die einzige Quelle der Wahrheit für veröffentlichte
Browsermodelle. Jeder Eintrag enthält vollständige Hub-Revision, erwartete Artefakte mit Bytezahl
und SHA-256, kommerziell nutzbare Lizenz, Tensorformen sowie Runtime und erlaubte Backends. Die
Validierung läuft beim Modulimport und lehnt unvollständige oder nicht freigegebene Einträge ab.

Die gemeinsame Runtime ist `@huggingface/transformers` 3.8.1 mit dem darin gepinnten
`onnxruntime-web` 1.22.0-dev.20250409-89f8206ba4. Das passende WASM-Artefakt wird lokal mit dem
App-Build ausgeliefert. MODNet nutzt den revisionsgebundenen
FP32-Graphen für `float32[1,3,H,W] → float32[1,1,H,W]` über WebGPU mit WASM-Fallback. SlimSAM 77
Uniform nutzt den FP16-Vision-Encoder und den FP16-Prompt-/Mask-Decoder über WebGPU. Punkt- und
Labeltensoren erzeugen drei postprozessierte Masken in Originalgröße und zugehörige IoU-Werte.

Der Modell-Manager verwendet ausschließlich diese validierten Definitionen. Parallelaufrufe
teilen dasselbe Lade-Promise. Fehler führen immer in einen sichtbaren `error`-Zustand mit Retry.
`dispose()` und Embedding-Caches werden beim Entladen berücksichtigt. Vollständige Quellen,
Lizenzketten, Größen und Prüfsummen stehen in `docs/THIRD_PARTY.md`.

`browser-ai-capabilities.ts` fordert den tatsächlichen WebGPU-Adapter an und prüft dessen
Feature-Set. Nur `shader-f16` aktiviert SlimSAM. Dieselbe Capability filtert die Modellkarten,
den Workspace-Snapshot, die erlaubten Modell-IDs in den WebMCP-Schemas und das Werkzeug
`apply_smart_selection`. Der SlimSAM-Loader wiederholt die Prüfung als letzte Laufzeitbarriere.
MODNet bleibt durch seinen deklarierten WASM-Fallback verfügbar.

`model-registry.ts` implementiert die disjunkte Zustandsmenge `not-loaded`, `downloading`,
`initializing`, `ready`, `unloading` und `error`. Unveränderliche Snapshots enthalten ausschließlich
Modelldefinition und sichtbaren Zustand; Runtime-Handles bleiben intern. Je Modell deduplizieren
separate Maps aktive Lade- und Entlade-Promises. Downloadfortschritt wird auf die manifestierte
Gesamtgröße begrenzt. Ein `AbortController` gehört genau zu einem Ladeversuch. Entladen bricht ihn
ab, sperrt neue Inferenz und wartet über eine Operationsmenge auf alle bereits gestarteten
Aufrufe. Erst nach erfolgreichem `dispose()` wird der Handle entfernt und `not-loaded`
veröffentlicht; ein Freigabefehler bleibt als retrybarer Fehler mit Handle erhalten.

`model-manager.ts` projiziert jeden Snapshot in eine semantische Modellkarte mit `aria-live`,
`progress`, verständlichem Fehler und genau der im Zustand zulässigen Aktion. Der MODNet-Loader
wird erst durch Laden oder Hintergrundentfernung dynamisch importiert. Er aggregiert die real
empfangenen Bytes der drei manifestierten Artefakte, versucht WebGPU vor WASM und hält den
Runtime-Handle ausschließlich in der Registry.

Der Hintergrundadapter liest RGBA lokal, bereitet RGB über `AutoProcessor` auf und führt den
festgelegten ONNX-Graphen aus. Die Alpha-Matte wird bilinear auf die Originalmaße skaliert und
mit dem vorhandenen Alpha-Kanal multipliziert; RGB bleibt unverändert. Das Ergebnis wird lokal
als PNG codiert und über denselben validierten Bildladepfad wieder in den Workspace übernommen.
MODNet und SlimSAM teilen Runtime-Konfiguration, verifizierten Artefaktcache, Fortschrittsadapter
und PNG-Encoder, ohne ihre Modellverträge zu vermischen.

`sam-model-loader.ts` lädt nach expliziter Nutzeraktion die beiden revisionsgebundenen
SlimSAM-FP16-Graphen ausschließlich über WebGPU. Pro Auswahl verarbeitet `AutoProcessor` das
lokale RGBA einmal und der Vision Encoder erzeugt Bild- und Positions-Embedding. Jeder weitere
Punkt verwendet dieselben Embeddings im Prompt-/Mask-Decoder. Vordergrundpunkte werden als Label
1, Hintergrundpunkte als Label 0 und alle Koordinaten über die Prozessor-Maße in den 1024er
Modellraum übertragen. Von drei postprozessierten Masken in Originalgröße wird deterministisch
die Maske mit dem höchsten IoU-Wert übernommen.

`smart-select-controller.ts` bildet die tatsächliche `object-fit: contain`-Bildfläche auf ein
Canvas in Originalauflösung ab. Maske und typisierte DOM-Punktmarker teilen damit exakt dieselbe
Geometrie. Punkte akkumulieren, während eine Inferenz läuft keine konkurrierende Aktualisierung.
Invertieren ändert nur die sichtbare und anzuwendende Polarität. Anwenden nullt den Alpha-Kanal
außerhalb der gewählten Maske; Verwerfen berührt weder `ImageStore` noch History.

`magic-wand-selection.ts` flutet vierfach zusammenhängend vom angeklickten Pixel. Die maximale
Abweichung jedes RGBA-Kanals zur unveränderten Ausgangsfarbe bildet die Empfindlichkeit von 0 bis
100 Prozent ab. Abgelehnte Pixel stoppen die Flutung; ein Farbverlauf kann die Toleranz daher nicht
schrittweise erweitern. Der Controller rendert die binäre Maske in Originalauflösung über derselben
`object-fit: contain`-Fläche. Erst die bestätigte Aktion nullt ausgewählte Alpha-Werte und erzeugt
eine manuelle Bildversion. Ein gemeinsamer typisierter Aktivitätswächter verhindert gleichzeitig
aktive Magic-Wand- und SlimSAM-Auswahlen.

`ImageStore` vergibt monoton steigende, typisierte Eingabeversionen und hält das Original neben
höchstens einer aktuellen manuellen oder KI-Ableitung. Ersetzen oder Wiederherstellen gibt nicht
mehr benötigte Object-URLs genau einmal frei. Jeder `ConversionRun` friert seine `ImageVersion`
gemeinsam mit SVG, Dateiname und Optionen ein. Der Run-Vergleich ergänzt die schema-basierte
Parametertabelle um „Eingabe“; Einzel- und A/B-Downloads lesen den Dateinamen aus dem angezeigten
Run statt aus der inzwischen möglicherweise gewechselten Eingabe.

`model-artifact-cache.ts` lädt ausschließlich die manifestierten revisionsgebundenen URLs mit dem
Abortsignal des Versuchs. Jeder Cache- und Netzwerk-Response wird vor der Verwendung gegen
Bytezahl und SHA-256 geprüft. Ein abweichender Cache-Eintrag wird gelöscht und einmal frisch
abgerufen. Erst die verifizierten Responses werden als eigener Transformers-Custom-Cache
freigegeben; dessen anschließende Modellinitialisierung arbeitet ohne weitere Remote-Auflösung.
Der persistente Artefaktcache gehört zum Downloadmanager und bleibt für Wiederverwendung erhalten.

Die Modelladapter machen `dispose()` idempotent. MODNet schließt seine ONNX-Session einmal und
gibt Ein- und Ausgabetensoren pro Inferenz in `finally` frei. SlimSAM wartet auf eine aktive
Maskenaktualisierung, gibt Punkt-/Label-/Maskentensoren pro Vorhersage und beide Embeddings beim
Beenden der Auswahl frei. Beim Modellentladen beendet der Adapter alle noch offenen Auswahlen vor
den beiden ONNX-Sessions.

## 9. Teststrategie

- Neue Funktionen entstehen als kleine vertikale Slices nach Red–Green–Refactor.
- Die Abnahme beginnt als Given–When–Then-Szenario in `TASKS.md` und wird vor der
  Implementierung direkt als ausführbarer Test codiert.
- Vitest deckt schnelle TypeScript-Verträge ab, Rusts eigener Testrunner die Engine und
  Playwright nur sichtbare kritische Browserabläufe; eine zusätzliche Cucumber-Laufzeit wird
  nicht verwendet.
- Während eines Slices läuft zuerst der kleinste aussagekräftige Test; breite Suites folgen
  vor dem Commit und an Meilenstein-Gates.
- Rust-Unit-Tests für Optionen, Detektoren und SVG-Assembly.
- Golden-Tests für kanonische SVG-Ausgabe.
- Pixelvergleich über `resvg`/`tiny-skia` für repräsentative Fixtures.
- Property-/Grenzwerttests für ungültige Dimensionen und Parameter.
- TypeScript-Tests für Stores, Diff, Größen und Tool-Schemas.
- Browser-Tests für Upload, Run, History, A/B, Export und Fehlerzustände.
- PWA-Vertragstests für Manifest, einmalige Share-Brücke und beide Bild-Startwege.
- WebMCP-End-to-End-Test im unterstützten Chrome-Build.
- Manueller Demo-Smoke-Test vor Release.

Alle handgeschriebenen Quell- und Testdateien bleiben unter 1000 physischen Zeilen. Ein
automatischer Check erzwingt diese Grenze. Weitere verbindliche Regeln stehen in
`docs/ENGINEERING_STANDARDS.md`.

## 10. Build und Auslieferung

- Rust-Formatierung und Clippy mit Warnungen als Fehler.
- WASM-Build über `npm run build:wasm`, intern `wasm-pack 0.15.0 --target web --release`, und
  anschließende Optimierung.
- Web-Build über Vite und exakt gepinntes TypeScript 7.0.2 mit reproduzierbarem Lockfile.
- Versionierte generierte WASM-Bindings, damit der Web-Build keinen Rust-Toolchain-Download
  voraussetzt; Rust-Änderungen regenerieren sie bewusst im selben Diff.
- Statische Auslieferung mit strenger Content Security Policy, soweit KI-Modellquellen dies
  zulassen.
- Abhängigkeits- und Lizenzbericht für Rust, JavaScript und Modelle.
