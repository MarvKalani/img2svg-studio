# Offene Umsetzungstasks

Diese Datei enthält ausschließlich noch offene Arbeit bis zur Build-Week-Einreichung am
**22. Juli 2026, 02:00 CEST**. Die Reihenfolge ist verbindlich, sofern ein Task keine
ausdrücklich genannte Abhängigkeit besitzt. Erledigte Tasks werden im zugehörigen
Abschluss-Commit vollständig aus dieser Datei gelöscht; Commit, Tests und Handbuch bilden
danach den dauerhaften Nachweis.

`RELEASE-01` und die Eigentümeranteile aus `RELEASE-05` dürfen parallel erledigt werden,
sobald die nötigen Angaben vorliegen; sie halten die autonome Implementierungsqueue nicht an.

## Verbindlicher Taskablauf

Für jeden Implementierungstask übernimmt der Orchestrator die Abnahme:

1. Scope, Vorbedingungen und vorhandenen Git-Diff prüfen.
2. Das unten definierte Gherkin-Szenario als kleinsten ausführbaren Test in Code schreiben.
3. Den Test aus dem erwarteten Grund fehlschlagen sehen (**Red**).
4. Nur den beschriebenen Slice implementieren (**Green**), danach bei Bedarf vereinfachen.
5. Den angegebenen Abnahmebefehl und alle vom Diff betroffenen Qualitätsprüfungen ausführen.
6. Den gebauten Stand **immer im echten Google Chrome** öffnen und den betroffenen Ablauf sowie
   den bisherigen Kernworkflow direkt bedienen. Playwright ersetzt diese Abnahme nicht.
7. Konsole, sichtbaren Zustand, Tastaturweg und unerwartete Netzwerkzugriffe im Chrome-Durchlauf
   prüfen; bei WebMCP zusätzlich registrierte Tools und deren sichtbare Wirkung kontrollieren.
8. Fällt ein Mangel auf, bleibt der Task an seiner Position. Der Orchestrator ergänzt
   Reproduktion, Sollverhalten und einen Regressionstest und führt denselben Slice erneut durch.
9. Erst nach mangelfreier Chrome-Abnahme Handbuch und betroffene Verträge aktualisieren.
10. Den Task aus dieser Datei löschen und den vollständigen Slice gemeinsam committen.

Ein Task gilt erst nach diesem Review als fertig. Der Commit-Betreff folgt
`type(TASK-ID): imperative summary`. Der Commit-Text dokumentiert Ergebnis, ausgeführte
Abnahme und Dokumentationsänderungen. Es werden keine dauerhaft roten Tests committed.

```text
Outcome:
- Geliefertes Verhalten
Acceptance:
- Exakter Befehl mit Ergebnis
Chrome Acceptance:
- Chrome-Version, geprüfter Ablauf und beobachtetes Ergebnis
Documentation:
- Aktualisierte Handbuch- und Vertragsabschnitte
```

Gherkin ist die lesbare Vertragssprache. Ausgeführt wird der Vertrag direkt in der passenden
schnellen Testschicht:

- Vitest für TypeScript-Logik und DOM-nahe Komponenten.
- Rust-Tests für Engine und SVG-Verträge.
- Playwright nur für sichtbare kritische Browserabläufe.

Eine zusätzliche Cucumber-Laufzeit und doppelte Step Definitions werden nicht eingeführt.
Vitest- und Playwright-Testnamen verwenden `Given … when … then …`; Rust-Testnamen bilden
dies als `given_..._when_..._then_...` ab.

## Globale Abnahmeregeln

Diese Regeln gelten für jeden Task, ohne in jeder Karte wiederholt zu werden:

- KISS, SINE, EVA, typisierte Domänenwerte und minimale Diffs gemäß
  [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md).
- Handgeschriebene Quell- und Testdateien haben maximal 1000 Zeilen.
- Formatierung, Lint, Typecheck, Rust-Clippy und Tests laufen warnungsfrei.
- Netzwerkverkehr besteht nur aus statischen App-Ressourcen und bewusst gestarteten
  Modell-Downloads; Bildverarbeitung bleibt lokal.
- Neue Abhängigkeiten sind exakt gepinnt, lizenziert und für den aktuellen Slice notwendig.
- `docs/HANDBOOK.md` beschreibt den funktionierenden Produktstand.
- Jeder Task enthält einen direkten Chrome-Durchlauf zusätzlich zu den automatisierten Tests.
- Ein sichtbarer Task erfüllt Tastatur- und verständliche Fehlerzustände in seinem Scope.
- Ein in Chrome entdeckter Mangel erweitert nur die Abnahme des aktuellen Tasks; er rechtfertigt
  weder einen halbfertigen Commit noch das Vorziehen anderer Slices.

---

## CONV-03 — Angezeigtes SVG herunterladen und Fehler beherrschen

**Ergebnis:** Der Nutzer lädt exakt das aktuell angezeigte SVG herunter. Enginefehler werden
typisiert bis in die UI geführt; die Oberfläche bleibt danach bedienbar.

```gherkin
Given eine erfolgreiche Konvertierung wird angezeigt
When der Nutzer SVG herunterladen wählt
Then entsprechen die heruntergeladenen Bytes exakt dem angezeigten SVG
And ein nachfolgender ungültiger Engine-Aufruf zeigt einen verständlichen Fehler ohne Panic
```

**Ausführbare Abnahme:** `web/e2e/download-svg.spec.ts` sowie Rust-Grenzfälle in
`crates/img2svg-core/tests/conversion_errors.rs`; `npm --prefix web run test:e2e --
download-svg.spec.ts` und `cargo test -p img2svg-core --test conversion_errors`.

**Dokumentation:** Handbuch „SVG herunterladen“ und öffentliche Fehlertypen.

## PARAM-01 — Wenige echte Konvertierungsparameter durchstechen

**Ergebnis:** Farbpräzision, Speckle-Filter und proportionale Zielgröße besitzen typisierte
Grenzen und kanonische Defaults und wirken von der linken UI über WASM bis zur Engine.

```gherkin
Given dasselbe geladene Fixture wurde mit den Standardwerten konvertiert
When Farbpräzision, Speckle-Filter oder Zielgröße auf einen anderen gültigen Wert gesetzt werden
Then zeigt die UI den validierten Wert und die tatsächlichen Zielmaße
And das neue Ergebnis enthält genau diese Einstellungen und eine nachvollziehbare Wirkung
```

**Ausführbare Abnahme:** Rust-Wirkungstest
`crates/img2svg-core/tests/conversion_options.rs`, Schema-Vertrag
`web/src/conversion/conversion-options.test.ts` und Browsertest
`web/e2e/change-parameters.spec.ts`; `cargo test -p img2svg-core --test conversion_options`,
`npm --prefix web test -- conversion-options.test.ts` und `npm --prefix web run test:e2e --
change-parameters.spec.ts`.

**Dokumentation:** Handbuch-Parameter und kanonische Defaults in der technischen Spezifikation.

## HISTORY-01 — Unveränderliche Conversion-Runs unten anzeigen

**Ergebnis:** Jede erfolgreiche Konvertierung erzeugt genau einen unveränderlichen Run. Die
History unten zeigt höchstens zehn Karten mit Run-ID, Thumbnail, Maßen, Pfadanzahl und Laufzeit.

```gherkin
Given ein Bild ist geladen
When der Nutzer elf erfolgreiche Konvertierungen ausführt
Then enthält die History die zehn neuesten unveränderlichen Runs in eindeutiger Reihenfolge
And das Auswählen eines Runs zeigt dessen SVG ohne seine gespeicherten Werte zu verändern
```

**Ausführbare Abnahme:** `web/src/history/history-store.test.ts` mit
`npm --prefix web test -- history-store.test.ts` und `web/e2e/history.spec.ts` mit
`npm --prefix web run test:e2e -- history.spec.ts`.

**Dokumentation:** Handbuch „Verlauf“ einschließlich Begrenzung und gespeicherter Metadaten.

## HISTORY-02 — Einstellungen eines Runs wiederherstellen

**Ergebnis:** „Einstellungen übernehmen“ kopiert die validierten Parameter eines alten Runs in
die Eingabemaske, ohne den Run oder das Originalbild zu verändern.

```gherkin
Given zwei Runs besitzen unterschiedliche Einstellungen
When der Nutzer die Einstellungen des älteren Runs übernimmt und erneut konvertiert
Then zeigt die Eingabemaske exakt dessen Einstellungen
And der neue Run liefert bei gleichem Bild byteidentische SVG-Ausgabe zum älteren Run
```

**Ausführbare Abnahme:** `web/src/history/restore-run.test.ts` und
`web/e2e/restore-run.spec.ts`; `npm --prefix web test -- restore-run.test.ts` und
`npm --prefix web run test:e2e -- restore-run.spec.ts`.

**Dokumentation:** Handbuch „Einstellungen wiederherstellen“.

## COMPARE-01 — Zwei Runs als A und B überblenden

**Ergebnis:** Zwei History-Runs können tastaturbedienbar als A und B markiert werden. Ein
0–100-Prozent-Slider überblendet beide deckungsgleich in derselben ViewBox.

```gherkin
Given zwei Runs mit verschiedenen Ergebnissen sind als A und B ausgewählt
When der Vergleichsregler auf 0, 50 und 100 Prozent bewegt wird
Then zeigt die gemeinsame Arbeitsfläche nur A, beide halbiert und nur B
And unterschiedliche Run-Maße verschieben die beiden Ebenen nicht gegeneinander
```

**Ausführbare Abnahme:** `web/src/compare/compare-selection.test.ts` und visueller
Browservertrag `web/e2e/compare-runs.spec.ts`; `npm --prefix web test --
compare-selection.test.ts` und `npm --prefix web run test:e2e -- compare-runs.spec.ts`.

**Dokumentation:** Handbuch „A/B-Vergleich“ und aktualisierter Screenshot.

## COMPARE-02 — Parameterunterschiede und A/B-Downloads anzeigen

**Ergebnis:** Unter A/B erscheint eine schema-basierte Tabelle, die standardmäßig nur echte
Parameterunterschiede zeigt. Downloads exportieren jeweils den tatsächlich gewählten Run.

```gherkin
Given A und B unterscheiden sich nur in der Farbpräzision
When der Nutzer nur Unterschiede anzeigen lässt
Then enthält die Tabelle genau eine Zeile mit beiden Farbpräzisionswerten
And die Downloads A und B entsprechen bytegenau den jeweiligen Runs
```

**Ausführbare Abnahme:** `web/src/compare/diff-settings.test.ts` und
`web/e2e/compare-downloads.spec.ts`; `npm --prefix web test -- diff-settings.test.ts` und
`npm --prefix web run test:e2e -- compare-downloads.spec.ts`.

**Dokumentation:** Handbuch „Parameter-Diff“ und Downloadverhalten.

## SHAPE-01 — Formerkennung sicher und abschaltbar einführen

**Ergebnis:** Ein typisierter globaler Schalter und aktivierte Formtypen steuern eine
Detektorkette. Der sichere Rest bleibt ein Pfad; ausgeschaltete Erkennung ändert keinen Byte.

```gherkin
Given ein Fixture wird mit deaktivierter Formerkennung konvertiert
When derselbe Input erneut mit deaktivierter Formerkennung verarbeitet wird
Then ist die Ausgabe byteidentisch zur bisherigen Pfadausgabe
And unbekannte Konturen bleiben bei aktivierter Erkennung als Pfad erhalten
```

**Ausführbare Abnahme:** `crates/img2svg-core/tests/shape_detection_fallback.rs` mit
`cargo test -p img2svg-core --test shape_detection_fallback`; UI-Schema in
`web/src/conversion/shape-options.test.ts` mit `npm --prefix web test --
shape-options.test.ts`.

**Dokumentation:** Handbuch-Schalter, Fallback und technischer Detektorvertrag.

## SHAPE-02 — Kreise als native SVG-Elemente erkennen

**Ergebnis:** Das vorhandene Kreis-PNG erzeugt bei aktivierter Kreiserkennung ein `<circle>`
mit Mittelpunkt, Radius und Farbe innerhalb der Manifesttoleranz; die Statistik zählt es.

```gherkin
Given das Kreis-Fixture und nur die Kreiserkennung sind aktiv
When das Bild konvertiert wird
Then enthält das SVG genau einen nativen Kreis innerhalb von 2 Pixel Geometrietoleranz
And die Formerkennungsstatistik meldet genau einen Kreis
```

**Ausführbare Abnahme:** `crates/img2svg-core/tests/detect_circle.rs` liest
`fixtures/shape-recognition/manifest.json`; `cargo test -p img2svg-core --test detect_circle`.

**Dokumentation:** Handbuch „Native Kreise“ und bekannte Toleranz.

## SHAPE-03 — Rechtecke als native SVG-Elemente erkennen

**Ergebnis:** Das Rechteck-Fixture wird als `<rect>` innerhalb der Manifesttoleranz ausgegeben;
nicht rechteckige Konturen bleiben Pfade.

```gherkin
Given das Rechteck-Fixture und nur die Rechteckerkennung sind aktiv
When das Bild konvertiert wird
Then enthält das SVG genau ein natives Rechteck mit erwarteter Geometrie und Farbe
And eine Freiformkontur wird nicht fälschlich als Rechteck ausgegeben
```

**Ausführbare Abnahme:** `crates/img2svg-core/tests/detect_rectangle.rs` mit
`cargo test -p img2svg-core --test detect_rectangle`.

**Dokumentation:** Handbuch „Native Rechtecke“.

## SHAPE-04 — Ellipsen von Kreisen unterscheiden

**Ergebnis:** Das Ellipsen-Fixture wird als `<ellipse>` ausgegeben; Kreisgrenzfälle bleiben bei
gleicher X-/Y-Ausdehnung `<circle>`.

```gherkin
Given Ellipsen- und Kreis-Fixture werden mit beiden Detektoren konvertiert
When die native Form gewählt wird
Then wird die Ellipse als ellipse und der Kreis als circle innerhalb der Toleranz ausgegeben
```

**Ausführbare Abnahme:** `crates/img2svg-core/tests/detect_ellipse.rs` mit
`cargo test -p img2svg-core --test detect_ellipse`.

**Dokumentation:** Handbuch „Native Ellipsen“ und Unterscheidungsregel.

## SHAPE-05 — Linien als native SVG-Elemente erkennen

**Ergebnis:** Das Linien-Fixture erzeugt eine native `<line>` mit erwarteten Endpunkten,
Strichfarbe und -breite; kompakte Freiformen bleiben Pfade.

```gherkin
Given das Linien-Fixture und nur die Linienerkennung sind aktiv
When das Bild konvertiert wird
Then enthält das SVG genau eine native Linie innerhalb der Manifesttoleranz
And die Statistik meldet genau eine Linie
```

**Ausführbare Abnahme:** `crates/img2svg-core/tests/detect_line.rs` mit
`cargo test -p img2svg-core --test detect_line`.

**Dokumentation:** Handbuch „Native Linien“.

## SHAPE-06 — Polygone als native SVG-Elemente erkennen

**Ergebnis:** Das Dreieck-Fixture erzeugt ein `<polygon>` innerhalb der Toleranz. Ein typisiertes
Vereinfachungs-Epsilon begrenzt die Kontur; komplexe Freiformen fallen auf Pfade zurück.

```gherkin
Given das Dreieck-Fixture und nur die Polygonerkennung sind aktiv
When das Bild konvertiert wird
Then enthält das SVG genau ein natives Polygon mit drei erwarteten Punkten
And eine Kontur außerhalb des Epsilon-Grenzwerts bleibt ein Pfad
```

**Ausführbare Abnahme:** `crates/img2svg-core/tests/detect_polygon.rs` mit
`cargo test -p img2svg-core --test detect_polygon`.

**Dokumentation:** Handbuch „Native Polygone“ und Epsilon-Verhalten.

## SHAPE-07 — Gemischte Formen deterministisch ausgeben

**Ergebnis:** Die gemischte Szene hält Detektorreihenfolge, Elementanzahl und Z-Reihenfolge
stabil und meldet keine Form doppelt.

```gherkin
Given alle unterstützten Formdetektoren und das Mixed-Fixture sind aktiv
When die Szene zweimal konvertiert wird
Then stimmen native Elementtypen, Geometrien, Anzahl und Reihenfolge mit dem Manifest überein
And beide SVG-Ausgaben sind byteidentisch
```

**Ausführbare Abnahme:** `crates/img2svg-core/tests/detect_mixed_shapes.rs` und
`web/e2e/shape-recognition.spec.ts`; `cargo test -p img2svg-core --test detect_mixed_shapes`
und `npm --prefix web run test:e2e -- shape-recognition.spec.ts`.

**Dokumentation:** Handbuch-Formerkennung und aktualisierte unterstützte Formen.

## AI-01 — Verwendbare Browsermodelle verbindlich festlegen

**Ergebnis:** MODNet- und SAM-Modell, Revision, Dateigröße, Lizenz, Quelle, Eingabe-/Ausgabeform
und kompatible Transformers.js-/ONNX-Runtime werden mit Primärquellen festgelegt.

```gherkin
Given ein Modell soll im veröffentlichten Produkt angeboten werden
When sein Registry-Eintrag validiert wird
Then besitzt er feste Revision, erwartete Dateien, Prüfsummen, Größe und zulässige Lizenz
And ein unvollständiger oder nicht kommerziell nutzbarer Eintrag wird abgelehnt
```

**Ausführbare Abnahme:** Registry-Schematest `web/src/ai/model-manifest.test.ts` mit
`npm --prefix web test -- model-manifest.test.ts`; zusätzlich manuelle Quellenprüfung mit
Primärlinks in `docs/THIRD_PARTY.md`.

**Dokumentation:** Drittanbieter-/Modellinventar und technische KI-Spezifikation.

## AI-02 — KI-Manager mit deterministischem Fake-Loader liefern

**Ergebnis:** Die UI zeigt pro Modell `not-loaded`, `downloading`, `initializing`, `ready` und
`error`, dedupliziert paralleles Laden und bietet Retry sowie Entladen über eine typisierte
Registry.

```gherkin
Given ein nicht geladenes Modell und ein kontrollierter Fake-Loader
When Laden zweimal parallel ausgelöst wird und der erste Versuch fehlschlägt
Then existiert nur ein Ladevorgang, der Fehler ist sichtbar und Retry erreicht ready
And Entladen ruft dispose genau einmal auf und endet in not-loaded
```

**Ausführbare Abnahme:** `web/src/ai/model-registry.test.ts` mit
`npm --prefix web test -- model-registry.test.ts`; DOM-Vertrag in
`web/src/ai/model-manager.test.ts` mit `npm --prefix web test -- model-manager.test.ts`.

**Dokumentation:** Handbuch „KI-Manager“, Zustände und Nutzeraktionen.

## AI-03 — MODNet laden und Hintergrund lokal entfernen

**Ergebnis:** Erst nach Nutzeraktion lädt das festgelegte MODNet mit echtem Bytefortschritt,
zeigt WebGPU/WASM-Backend und erzeugt lokal ein neues RGBA-Bild mit Alpha-Maske.

```gherkin
Given ein Bild mit Vordergrund und ein noch nicht geladenes MODNet
When der Nutzer Hintergrund entfernen ausführt
Then werden Downloadfortschritt und tatsächliches Backend sichtbar
And das Ergebnis erfüllt die festgelegten Alpha-Erwartungen ohne Bild-Upload
```

**Ausführbare Abnahme:** Adaptertests `web/src/ai/modnet-adapter.test.ts` mit kleinem Fixture und
Browsertest `web/e2e/remove-background.spec.ts`; `npm --prefix web test --
modnet-adapter.test.ts` und `npm --prefix web run test:ai -- remove-background.spec.ts`.
Die Netzwerkassertion erlaubt nur die festgelegten Modellartefakte.

**Dokumentation:** Handbuch-BG-Remove, Modellgröße, Backend und erstmaliger Download.

## AI-04 — Modellressourcen zuverlässig freigeben und Fehler erholen

**Ergebnis:** Entladen wartet auf Inferenz, beendet Session, Tensoren und Caches und meldet den
tatsächlichen Endzustand. Abbruch, Offlinefehler und beschädigte Cache-Daten bleiben retrybar.

```gherkin
Given ein geladenes oder gerade verwendetes Modell
When Entladen oder ein Ladefehler eintritt
Then endet keine Operation dauerhaft in downloading oder initializing
And alle besessenen Ressourcen werden einmal freigegeben und ein Retry bleibt möglich
```

**Ausführbare Abnahme:** `web/src/ai/model-lifecycle.test.ts` und
`web/e2e/model-lifecycle.spec.ts`; `npm --prefix web test -- model-lifecycle.test.ts` und
`npm --prefix web run test:e2e -- model-lifecycle.spec.ts`.

**Dokumentation:** Handbuch-Fehlerbehebung und technische Ressourceninvarianten.

## AI-05 — SAM-Auswahl mit positiven und negativen Punkten liefern

**Ergebnis:** Nach explizitem Modelldownload kann der Nutzer mindestens zwei positive und einen
negativen Punkt setzen, die Maske verfeinern, invertieren, anwenden oder verwerfen.

```gherkin
Given SAM ist geladen und ein lokales Bild wird angezeigt
When zwei positive und ein negativer Auswahlpunkt gesetzt werden
Then zeigt die Arbeitsfläche Punkte und aktualisierte Maske deckungsgleich
And Anwenden erzeugt RGBA, während Verwerfen Original und History unverändert lässt
```

**Ausführbare Abnahme:** `web/src/ai/sam-selection.test.ts` mit
`npm --prefix web test -- sam-selection.test.ts`; realer Adapter- und Browserablauf in
`web/e2e/smart-select.spec.ts` mit `npm --prefix web run test:ai -- smart-select.spec.ts`.

**Dokumentation:** Handbuch „Smart Select“, Punktbedeutung, Anwenden und Beenden.

## AI-06 — KI-Ergebnis in Conversion und Vergleich übernehmen

**Ergebnis:** Ein angewendetes MODNet- oder SAM-Ergebnis wird zur versionierten Eingabe des
normalen Workflows und kann konvertiert, in der History verglichen und exportiert werden;
das Original bleibt wiederherstellbar.

```gherkin
Given eine KI-Maske wurde auf das geladene Bild angewendet
When der Nutzer konvertiert und den neuen Run mit dem vorherigen vergleicht
Then verwendet nur der neue Run die versionierte KI-Eingabe
And Original, beide Runs, Parameter-Diff und Downloads bleiben konsistent
```

**Ausführbare Abnahme:** `web/e2e/ai-conversion-workflow.spec.ts` mit
`npm --prefix web run test:e2e -- ai-conversion-workflow.spec.ts`.

**Dokumentation:** Handbuch-Ende-zu-Ende-Ablauf und Grenzen.

## MCP-01 — Aktuellen WebMCP-Vertrag verifizieren und Fähigkeiten anbieten

**Ergebnis:** Die aktuelle Chrome-Schnittstelle wird mit Primärquellen bestätigt. In Chrome
149 oder neuer sind `#enable-webmcp-testing` und `#devtools-webmcp-support` aktiviert. Ein
schmaler Adapter registriert `get_capabilities` per Feature Detection und lässt die UI ohne
WebMCP vollständig funktionieren.

```gherkin
Given ein Browser mit oder ohne unterstützte WebMCP-Schnittstelle
When img2svg Studio startet und get_capabilities aufgerufen wird
Then liefert ein unterstützter Browser ein eng typisiertes Fähigkeitsresultat
And ein nicht unterstützter Browser behält eine fehlerfreie vollständig bedienbare UI
```

**Ausführbare Abnahme:** `web/src/webmcp/webmcp-adapter.test.ts` mit unterstütztem und fehlendem
API-Fake sowie `web/e2e/webmcp-fallback.spec.ts`; `npm --prefix web test --
webmcp-adapter.test.ts` und `npm --prefix web run test:e2e -- webmcp-fallback.spec.ts`.
Anschließend bestätigt der Orchestrator im echten Chrome `document.modelContext`, den
registrierten Toolnamen und den fehlerfreien UI-Fallback bei deaktivierter API.

**Dokumentation:** Quellen, Ziel-Chrome, Aktivierung, Sicherheitsgrenzen und UI-Fallback.

**Bedingter Ersatz:** Erst wenn WebMCP trotz unterstützter Chrome-Version, aktivierter Flags,
korrekter Origin-/Permissions-Konfiguration und behobener eigener Fehler nicht durch den
Browser-Agenten nutzbar ist, wird MCP-02 vor Arbeitsbeginn durch einen Apps-SDK-Slice ersetzt.
Dieser baut einen ChatGPT-kompatiblen MCP-Server und eine iframe-UI auf denselben typisierten
Anwendungsdiensten. Damit entsteht ein alternativer Agentenkanal in ChatGPT.

## MCP-02 — Parameter konfigurieren und sichtbare Konvertierung ausführen

**Ergebnis:** `configure_conversion` verwendet dieselben Validatoren wie die UI und aktualisiert
sichtbar die Parameter. `convert_current_image` erzeugt denselben Runpfad wie der Button.

```gherkin
Given ein Bild ist geladen und WebMCP ist verfügbar
When ein Agent gültige Parameter setzt und convert_current_image aufruft
Then zeigt die UI sofort dieselben validierten Werte
And der erzeugte Run erscheint mit identischem Vertrag in Ansicht und History
```

**Ausführbare Abnahme:** `web/src/webmcp/conversion-tools.test.ts` und
`web/e2e/webmcp-conversion.spec.ts`; `npm --prefix web test -- conversion-tools.test.ts` und
`npm --prefix web run test:webmcp -- webmcp-conversion.spec.ts` im dokumentierten Ziel-Browser.
Der Orchestrator ruft beide Tools zusätzlich direkt über den verbundenen Chrome-Agenten auf
und bestätigt, dass Parameter, Ergebnis und History im sichtbaren Tab synchron reagieren.

**Dokumentation:** Handbuch-Agentenablauf, Tool-Schemas und strukturierte Fehler.

## MCP-03 — Den Vorgänger `img2.download` vollständig über WebMCP bedienen

**Ergebnis:** Der bestehende Vorgänger auf `https://img2.download` liefert die nötigen
Origin-/Permissions-Header. Ein kleiner getrennter Adapter bildet jedes vorhandene sichtbare
Converter-Kommando auf ein eng typisiertes WebMCP-Werkzeug ab und verwendet den vorhandenen
Anwendungszustand der Seite.

```gherkin
Given ein lokales Bild wurde im bestehenden Converter auf https://img2.download bestätigt
When ein Browser-Agent dessen vollständigen sichtbaren Ablauf über WebMCP ausführt
Then reagieren alle vorhandenen Converter-Funktionen sichtbar und konsistent
And jedes vorhandene UI-Kommando ist genau einem registrierten WebMCP-Werkzeug zugeordnet
```

**Ausführbare Abnahme:** `integrations/img2-download/tool-capability-map.test.ts` vergleicht die
vorhandenen UI-Kommandos mit dem Tool-Inventar; `web/e2e/predecessor-webmcp.spec.ts` prüft den
vollständigen Produktionsablauf. `npm --prefix web test --
../integrations/img2-download/tool-capability-map.test.ts` und
`npm --prefix web run test:webmcp -- predecessor-webmcp.spec.ts` müssen grün sein. Der
Orchestrator prüft zusätzlich im echten Chrome 150 oder neuer Response-Header, registrierte
Toolnamen, sichtbare Zustandsänderungen, Download und fehlerfreie Konsole auf der
Produktionsdomain.

**Vorbedingung:** Das Quellprojekt oder der deploybare Asset-Pfad des Vorgängers ist lokal oder
über GitHub verfügbar.

**Dokumentation:** Vollständiges Vorgänger-Tool-Inventar, lokale Dateiübergabe, Hosting-Header
und Agentenablauf.

## RELEASE-01 — Devpost-Teilnahme, Lizenz und GitHub-Zugriff festlegen

**Benötigte Eigentümerentscheidung:** Devpost-Teilnahme bestätigen sowie Repository-URL,
öffentlich oder privat und Projektlizenz festlegen. Empfohlener Default ist ein öffentliches
Repository mit Apache-2.0-Lizenz; die Entscheidung bleibt beim Rechteinhaber.

```gherkin
Given ein Judge öffnet das eingereichte Repository ohne Entwicklerzugang
When Lizenz, Hauptbranch und dokumentierter Setup-Pfad geprüft werden
Then ist der erlaubte Nutzungsumfang eindeutig und der zu bewertende Commit erreichbar
And das Projekt ist dem richtigen Devpost-Event beigetreten
```

**Abnahmenachweis:** `LICENSE`, Git-Remote, erfolgreicher Push und unangemeldeter Browsercheck;
bei privatem Repository bestätigter Zugriff für beide in `docs/SUBMISSION.md` genannten
Judge-Adressen. Externe Aktionen werden als Nachweis dokumentiert; Repository-Änderungen
erhalten den zugehörigen Commit.

**Dokumentation:** README, Drittanbieterinventar, UI-Footer und Submission-Checkliste.

## RELEASE-02 — Datenschutz, Robustheit und Barrierefreiheit auditieren

**Ergebnis:** Kernworkflow ist tastaturbedienbar, verständlich beschriftet und robust gegen
beschädigte sowie zu große Eingaben; ein Netzwerkaudit findet nur explizite Modell-Downloads.

```gherkin
Given ein frischer Browser und der vollständige Demoablauf
When er per Tastatur, mit beschädigter Datei und unter Netzwerkbeobachtung ausgeführt wird
Then bleiben Fokus, Fehlermeldungen und Bedienbarkeit nachvollziehbar
And Netzwerkverkehr besteht nur aus App-Ressourcen und bewusst gestarteten Modell-Downloads
```

**Ausführbare Abnahme:** `web/e2e/release-audit.spec.ts`, Accessibility-Scan und manueller
Browser-/Netzwerkcheck; `npm --prefix web run test:e2e -- release-audit.spec.ts`. Das
Checkprotokoll wird in `docs/release/RELEASE_AUDIT.md` festgehalten.

**Dokumentation:** Handbuch-Fehlerhilfe, Datenschutz und bekannte Eingabegrenzen.

## RELEASE-03 — Öffentliche statische Demo reproduzierbar deployen

**Ergebnis:** Ein Produktionsbuild läuft kostenlos und ohne Login auf
`https://studio.img2.download` mit nötigen Sicherheitsheadern und funktioniert in einem
frischen Ziel-Browser.

```gherkin
Given die öffentliche Demo-URL wird ohne bestehende Sitzung geöffnet
When das Kreis-Fixture geladen, konvertiert, verglichen und exportiert wird
Then funktioniert der Kernablauf ohne lokale Reparatur oder kostenpflichtigen Zugang
And Reload und direkte Start-URL liefern weiterhin die Anwendung
```

**Ausführbare Abnahme:** `web/e2e/deployed-demo.spec.ts`; `npm --prefix web run build`,
`npm --prefix web run test:e2e -- deployed-demo.spec.ts` gegen den Preview-Server und
`IMG2SVG_DEMO_BASE_URL=<Produktions-URL> npm --prefix web run test:e2e --
deployed-demo.spec.ts` gegen die veröffentlichte Demo.

**Dokumentation:** README-Demo-/Deployment-Link und Submission-Testanleitung.

## RELEASE-04 — Englische Einreichungsunterlagen fertigstellen

**Ergebnis:** README und Devpost-Text erklären Problem, Lösung, Architektur, lokalen Datenschutz,
Codex-/GPT-5.6-Zusammenarbeit, Setup, Tests, Grenzen, Lizenz und freien Demo-Zugang auf Englisch.

```gherkin
Given ein Judge kennt das Projekt nicht
When ausschließlich README, Devpost-Text und verlinkte Demo verwendet werden
Then kann er Nutzen, Bedienung, technischen Beitrag und Codex-Einsatz nachvollziehen
And jeder beworbene Funktionssatz ist durch einen grünen Test und die Demo belegt
```

**Abnahmenachweis:** Link-/Sprachprüfung, `npm ci && npm run check` in einem frischen Checkout
und Funktionsaudit gegen Handbuch und Testliste.

**Dokumentation:** README, `docs/SUBMISSION.md`, Architekturübersicht und finale Screenshots.

## RELEASE-05 — Demovideo und Devpost-Einreichung abschließen

**Gemeinsame Aktion:** Der Orchestrator erstellt Drehbuch, Shotlist und Prüfprotokoll; der
Projekteigner bestätigt Veröffentlichung, `/feedback`-Session-ID und endgültiges Absenden.

```gherkin
Given Demo, Repository und Einreichungstext sind final geprüft
When das öffentliche Video und alle Devpost-Felder unangemeldet geöffnet werden
Then dauert das Video weniger als drei Minuten und erklärt Codex/GPT-5.6 hörbar auf Englisch
And Demo, Repository, Session-ID, Lizenzen und Testzugang sind vollständig erreichbar
```

**Abnahmenachweis:** öffentliches YouTube-Video, unangemeldeter Linkcheck, gespeicherte
Submission-Vorschau und Eigentümerbestätigung vor dem Absenden. Externe Aktionen werden nicht
durch künstliche Code-Tests ersetzt.

**Dokumentation:** finale Submission-Checkliste, Demo-Drehbuch und Release-Commit/Tag.
