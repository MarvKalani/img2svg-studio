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
