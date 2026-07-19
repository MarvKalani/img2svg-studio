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

## APPS-01 — Ein Bild über den stateless MCP-Server vektorisieren

**Ergebnis:** Ein eigener Node/TypeScript-Workspace stellt `/mcp` über das offizielle MCP SDK und
Streamable HTTP bereit. `vectorize_image` akzeptiert den offiziellen ChatGPT-Datei-Parameter oder
für Inspector-Tests Base64, validiert feste Größenlimits und verwendet nach Rasterdekodierung den
vorhandenen `img2svg-core` über dessen WASM-Grenze. Modus, Farbanzahl und Detailstufe werden in
typisierte Engine-Optionen übersetzt. Der Prozess speichert keine Eingabe und kein Ergebnis.

```gherkin
Given ein gültiges PNG wurde als ChatGPT-Datei oder Base64 an vectorize_image übergeben
When das Modell Modus, Farbanzahl und Detailstufe wählt
Then liefert derselbe Rust-Kern ein valides deterministisches SVG
And die strukturierte Antwort enthält effektive Parameter, Maße, Bytes und Elementzahlen
```

**Ausführbare Abnahme:** Schnelle Vitest-Vertragstests prüfen Datei- und Base64-Eingang, Limits,
Parameterabbildung, deterministische Fixture-Ausgabe und stabile Fehlercodes. Ein Streamable-HTTP-
Integrationstest initialisiert den Server, listet das Tool und ruft es mit dem Kreis-Fixture auf.
Danach laufen `npm run check` und der MCP Inspector gegen `http://127.0.0.1:8787/mcp`.

**Stand 20. Juli 2026:** Implementierung, dreizehn MCP-Workspace-Tests, Typecheck, Build sowie
`tools/list` und der echte Kreisaufruf im offiziellen Inspector sind grün. Der Inspector erhielt
ein 142-Byte-SVG mit genau einem nativen Kreis und keinem Pfad. Chrome Browser Use blockiert lokale
Adressen; die direkte Chrome- und ChatGPT-Abnahme folgt am öffentlichen HTTPS-Endpunkt gemeinsam
mit `APPS-02`.

**Dokumentation:** Setup, Tool-Schema, Parameterheuristik, Dateigrenzen, Datenschutz und Deployment.

## APPS-02 — SVG als ChatGPT-Widget anzeigen und exakt herunterladen

**Ergebnis:** `get_svg_preview` ist ein reines Renderwerkzeug mit eigener MCP-Apps-Ressource. Das
Widget zeigt das von `vectorize_image` gelieferte SVG, die wichtigsten Statistiken und lädt exakt
dieselben SVG-Bytes herunter. Toolbeschreibung und Parameterhinweise führen das Modell selbst zu
einem sinnvollen ersten Profil und bei „mach es einfacher“ zu weniger Farben und niedrigerem Detail.

```gherkin
Given vectorize_image hat SVG und Statistiken geliefert
When das Modell get_svg_preview mit diesem Ergebnis aufruft
Then erscheint ein zugängliches SVG-Widget inline in ChatGPT
And der Download enthält exakt das angezeigte SVG
When der Nutzer um eine einfachere Variante bittet
Then ruft das Modell vectorize_image erneut mit reduzierter Komplexität auf
```

**Ausführbare Abnahme:** DOM-nahe Widgettests prüfen Darstellung, untrusted SVG als isolierte
Bildquelle, Statistiken und Byte-identischen Download. MCP Inspector prüft Ressource, Metadaten und
Renderwerkzeug. Die Endabnahme lädt ein Bild in ChatGPT Developer Mode hoch, führt beide Aufrufe
aus und wiederholt die Konvertierung über die natürliche Folgeanweisung.

**Vorbedingung:** `APPS-01` und ein öffentlich erreichbarer HTTPS-`/mcp`-Endpunkt.

**Stand 20. Juli 2026:** Renderwerkzeug, MCP-Apps-Ressource, isolierte SVG-Bilddarstellung,
byte-identischer Blob-Download, Größenlimit und achtzehn MCP-Workspace-Tests sind grün. Der
offizielle Inspector listet beide Werkzeuge und die `text/html;profile=mcp-app`-Ressource und
rendert das Test-SVG mit korrekten Statistiken. Die endgültige Widget- und Folgeprompt-Abnahme in
Chrome/ChatGPT wartet auf den öffentlichen HTTPS-Endpunkt.

**Dokumentation:** ChatGPT-Verbindung, Golden Prompts, Widget-Bedienung und Fehlerfälle.

## APPS-03 — Ein Bild über einen festen externen Pfad als 3D-SVG-Vorschau darstellen

**Priorität:** Stretch-Slice nach vollständiger Abnahme von `APPS-01` und `APPS-02`.

**Ergebnis:** `image_to_3d` verwendet genau einen fest gepinnten externen Provider, wartet begrenzt
auf ein GLB und rendert es mit einem einfachen Drehregler. three.js `SVGRenderer` erzeugt jeden
sichtbaren Frame als SVG. Providerfehler sind typisiert; der API-Key kommt ausschließlich aus der
dokumentierten Umgebung.

```gherkin
Given ein unterstütztes Bild und ein gültiger Provider-Key liegen vor
When image_to_3d den festen Konvertierungspfad ausführt
Then erscheint ein drehbares Objekt und jeder angezeigte Frame ist SVG
And Timeout, Providerfehler und ungültige GLB-Daten enden verständlich ohne Teilzustand
```

**Ausführbare Abnahme:** Provider-Porttests verwenden Fixtures statt bezahlter Aufrufe; ein explizit
gestarteter Smoke-Test und ChatGPT Developer Mode prüfen den echten Pfad. `.env.example` enthält
nur Variablennamen und Erläuterungen.

**Dokumentation:** Provider, Kostenhinweis, Datenfluss, Key-Setup, Timeout und Grenzen.

---

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

**Stand 19. Juli 2026:** Die Quellprojekt-Commits `e386756` und `e739a54`, Capability-Test,
frischer statischer Build und vollständiger lokaler Chrome-150-Ablauf sind grün. Der erzeugte
`dist`-Build exportierte das Kreis-Fixture als 647-Byte-SVG. Offen bleiben der GitHub-Push nach
einmaliger Anmeldung, das dadurch ausgelöste Cloudflare-Deployment und dieselbe Abnahme auf
`https://img2.download`.

**Dokumentation:** Vollständiges Vorgänger-Tool-Inventar, lokale Dateiübergabe, Hosting-Header
und Agentenablauf.

## RELEASE-01 — Devpost-Teilnahme, Lizenz und GitHub-Zugriff festlegen

**Benötigte Eigentümerentscheidung:** Devpost-Teilnahme bestätigen sowie öffentliches oder privates
Repository festlegen. Die Projektlizenz ist BSL 1.1 mit einem Additional Use Grant unter 100.000
USD Jahresumsatz und Apache-2.0 als Change License ab spätestens 20. Juli 2030.

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

## RELEASE-03 — Öffentliche statische Demo reproduzierbar deployen

**Ergebnis:** Ein Produktionsbuild läuft kostenlos und ohne Login auf
`https://studio.img2.download` mit nötigen Sicherheitsheadern und funktioniert in einem
frischen Ziel-Browser.

**Status 19. Juli:** Produktionsbuild, lokaler Preview-Test und direkte Chrome-150-Abnahme sind
grün. Veröffentlichung und öffentliche Abnahme folgen nach GitHub-/Cloudflare-Zugriff; die
Ziel-Domain hat noch keinen DNS-Eintrag.

```gherkin
Given die öffentliche Demo-URL wird ohne bestehende Sitzung geöffnet
When das geometrische Beispiel geladen, konvertiert, verglichen und exportiert wird
Then funktioniert der Kernablauf ohne lokale Reparatur oder kostenpflichtigen Zugang
And Reload und direkte Start-URL liefern weiterhin die Anwendung
```

**Ausführbare Abnahme:** `web/e2e/deployed-demo.spec.ts`; `npm --prefix web run test:demo`
gegen den Preview-Server und `IMG2SVG_DEMO_BASE_URL=<Produktions-URL> npm --prefix web run
test:demo` gegen die veröffentlichte Demo.

**Dokumentation:** README-Demo-/Deployment-Link und Submission-Testanleitung.

## RELEASE-04 — Englische Einreichungsunterlagen fertigstellen

**Ergebnis:** README und Devpost-Text erklären Problem, Lösung, Architektur, lokalen Datenschutz,
Codex-/GPT-5.6-Zusammenarbeit, Setup, Tests, Grenzen, Lizenz und freien Demo-Zugang auf Englisch.

**Status 19. Juli:** Englischer README-/Devpost-Text, Architektur, Drittanbieterinventar,
Linkprüfung, frischer Checkout und finale Chrome-Screenshots sind abgenommen. Finale Demo-,
Repository-, Lizenz- und Video-Links folgen nach den dokumentierten Owner-Aktionen.

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

**Status 19. Juli:** Getaktetes englisches Drehbuch, Shotlist, Take-Checkliste und technischer
Chrome-150-Probelauf sind dokumentiert. Öffentliche Aufnahme, YouTube-Prüfung, Session-ID und
Devpost-Abgabe bleiben gemeinsame Abschlussaktionen.

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
