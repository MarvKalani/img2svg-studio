# Entscheidungsprotokoll

Dieses Dokument hält verbindliche Entscheidungen fest. Änderungen erhalten einen neuen
Eintrag oder markieren einen alten Eintrag ausdrücklich als ersetzt.

## D-001 — Local-first im Browser

**Status:** entschieden

Bildverarbeitung und Konvertierung laufen im Browser. Netzwerkverkehr besteht aus statischen
App-Ressourcen und sichtbaren optionalen Modell-Downloads.

## D-002 — `visioncortex` als Fundament

**Status:** entschieden; Submission-Umfang durch D-020 präzisiert

Clustering und rohes Tracing verwenden `visioncortex` als reguläre Abhängigkeit. Die eigene
Leistung liegt in typisierter Konfiguration, Detektoren, deterministischer SVG-Assembly,
Vergleichsworkflow, KI-Werkzeugen, WebMCP und UI. Abhängigkeit und Lizenz werden transparent
genannt.

## D-003 — Formerkennung als optionale Schicht

**Status:** entschieden; ersetzt die starre Trennung in Pure und Smart

Die robuste Pfad-Pipeline bleibt immer verfügbar. Native Formen werden global und pro Typ
aktiviert. Die Engine modelliert einzelne Fähigkeiten statt zweier unflexibler Modi.

## D-004 — Sichere Reststrategie

**Status:** durch D-020 für den Submission-MVP präzisiert

Nicht erkannte Inhalte bleiben immer Pfade.

## D-005 — Web-Stack

**Status:** entschieden

Vite und TypeScript ohne schweres UI-Framework. Das reduziert Abhängigkeiten und hält Canvas-,
Worker- und WebMCP-Integration direkt kontrollierbar. Diese Entscheidung darf überprüft
werden, falls das UI dadurch nachweislich schwerer wartbar wird.

## D-006 — Rust-Workspace

**Status:** entschieden; durch D-020 präzisiert

Core und WASM-Binding werden getrennte Crates. Die Core-Engine bleibt browserunabhängig.

## D-007 — WebMCP als progressive Erweiterung

**Status:** entschieden

Die Anwendung funktioniert vollständig ohne WebMCP. Ein Adapter nutzt Feature Detection und
die aktuelle `document.modelContext`-API. Tool-Aufrufe und UI verwenden dieselben Services.
Ein sichtbarer Browser-Tab gehört zum vorgesehenen Agentenablauf.

## D-008 — Größenmodell

**Status:** durch D-020 für den Submission-MVP präzisiert

Die Submission unterstützt unveränderte Größe und proportionale Skalierung von 10 bis 400
Prozent.

## D-009 — Lizenz des eigenen Projekts

**Status:** offen, blockiert Veröffentlichung und Einreichung, nicht die lokale Entwicklung

Ausgangswunsch ist BSL 1.1 mit späterem Wechsel zu Apache 2.0. Falls die Hackathon-Regeln eine
OSI-Lizenz verlangen, soll die Einreichung direkt Apache 2.0 verwenden. Vor Veröffentlichung
müssen die konkreten Regeln und die Entscheidung des Lizenzgebers dokumentiert werden.

## D-010 — Binäre Eingabe für Browser-Agenten

**Status:** entschieden; Toolumfang durch D-023 erweitert

Lokale Bilddateien werden über die browserbestätigte Datei-/Drop-Oberfläche geladen. WebMCP
übernimmt danach den vollständigen sichtbaren Produktablauf. Dadurch bleiben binäre Daten
außerhalb großer JSON-Tool-Aufrufe, während Mensch und Agent denselben Workspace bedienen.

## D-011 — TypeScript 7 als Web-Compiler

**Status:** entschieden

Das Webprojekt pinnt TypeScript 7.0.2 als aktuelle stabile Version vom 19. Juli 2026. Der
native Compiler liefert erheblich schnelleres Build- und Editor-Feedback und passt damit zum
kurzen TDD-Zyklus. Nightly-Versionen werden nicht verwendet; Updates erfolgen als eigener,
getesteter Dependency-Slice.

Quellen:

- <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- <https://www.npmjs.com/package/typescript>

## D-012 — Verbindliche Engineering-Standards

**Status:** entschieden

KISS, SINE, EVA, TDD, vertikale Slices, minimale Git-Diffs, sprechende Namen, typisierte
Domänenwerte und Warum-Kommentare sind verbindlich. Jede handgeschriebene Quell- oder
Testdatei bleibt unter 1000 Zeilen. Die ausführbaren Regeln stehen in
`docs/ENGINEERING_STANDARDS.md`.

## D-013 — OpenAI Build Week als Einreichungsziel

**Status:** entschieden

Das Projekt wird für die OpenAI Build Week vorbereitet. Die Einreichungsfrist ist der
21. Juli 2026 um 17:00 Pacific Time, entsprechend dem 22. Juli 2026 um 02:00 CEST. Wegen der
kurzen Restzeit priorisiert `docs/SUBMISSION.md` einen funktionierenden vertikalen Kern als
erste Ausführungsreihenfolge.

## D-014 — Track Developer Tools

**Status:** empfohlen, Bestätigung des Projekteigners ausstehend

Developer Tools ist der passendste Track für die lokale Konvertierungs-Engine, den
experimentellen A/B-Workflow und die WebMCP-Steuerung. Die finale Auswahl wird vor dem
Devpost-Submit bestätigt.

## D-015 — Lösungsorientierte MVP-Ausführung

**Status:** entschieden

Die Hackathon-Umsetzung folgt „make it work, make it right, make it fast“. Bei nicht
wesentlichen Unklarheiten wird die beste reversible Lösung gewählt und umgesetzt. Eine nur
hypothetisch bessere Architektur stoppt keinen funktionierenden Slice. Optimiert wird erst
nach Messung und nur, wenn der Engpass MVP oder Demo beeinträchtigt.

## D-016 — MVP priorisiert die sichtbare Converter-Erfahrung

**Status:** entschieden

Vor vollständiger Engine-Tiefe entsteht die erkennbare Produktvorstellung: Parameter links,
Arbeitsfläche mittig sowie History und A/B-Vergleich unten. Wenige echte Parameter beweisen
den Parameter-Diff. Der KI-Manager integriert zuerst ein reales, bedarfsgeladenes MODNet-Modell
mit Fortschritt, Retry und Entladen. Weitere Modelle, SAM, vollständige Shape-Erkennung und
Parameterbreite folgen innerhalb der Submission Period nach dem funktionierenden MVP-Kern.

## D-017 — Der Deadline-Stand ist der Bewertungsstand

**Status:** entschieden

Die in den Regeln genannten Stufen eins und zwei sind Bewertungsstufen. Jede gegenüber der Jury
beschriebene Funktion funktioniert deshalb vor Ende der Submission Period, ist getestet,
dokumentiert und deployed.

## D-018 — Handbuch ist Bestandteil jedes Slices

**Status:** entschieden

Dokumentation wird nicht bis zum Release aufgeschoben. Nutzerverhalten, öffentliche Verträge
und Entscheidungen werden im selben Commit wie die zugehörige Änderung nachgeführt. Ein Task
ist erst abgeschlossen, wenn `docs/HANDBOOK.md` und die betroffenen Projektdokumente den
tatsächlich gelieferten Stand beschreiben.

## D-019 — Gherkin-Vertrag ohne separate Cucumber-Laufzeit

**Status:** entschieden

`TASKS.md` enthält ausschließlich offene Arbeit. Jeder Implementierungstask definiert ein
Given–When–Then-Szenario, das der Orchestrator vor der Implementierung in Vitest, Playwright
oder einen nativen Rust-Test überführt und zunächst rot sieht. Separate `.feature`-Dateien und
Step Definitions werden vermieden, weil sie denselben Vertrag doppelt pflegen und den schnellen
TDD-Zyklus verlängern würden. Nach grüner Abnahme wird der Task im Abschluss-Commit aus der
Liste gelöscht; Commit-Text, Test und Dokumentation bilden den dauerhaften Nachweis.

## D-020 — Taskliste und Produktvertrag bilden denselben Submission-Umfang

**Status:** entschieden

Die offenen Slices in `TASKS.md`, Produkt- und Technikspezifikation beschreiben denselben
Submission-Umfang. Neue Funktionen erhalten vor der Implementierung einen eigenen vollständigen
Taskvertrag.

## D-021 — Jeder Task benötigt eine direkte Chrome-Abnahme

**Status:** entschieden

Automatisierte Unit-, Vertrags- und Playwright-Tests sind notwendig, ersetzen aber keine
wirkliche Produktabnahme. Der Orchestrator bedient jeden Slice zusätzlich im echten Google
Chrome, kontrolliert sichtbaren Zustand, Tastaturweg, Konsole und Netzwerk und dokumentiert
Version sowie Ablauf im Commit. Ein gefundener Mangel hält denselben Task offen, beginnt mit
einem Regressionstest und wird vor jeder anderen Arbeit nachgebessert.

## D-022 — WebMCP zuerst, Apps SDK nur als nachgewiesener Rückfallweg

**Status:** entschieden

WebMCP bleibt die Primärintegration, weil seine Tools direkt in der sichtbaren Browserseite
laufen und denselben lokalen Zustand wie der Nutzer verwenden. Die Abnahme aktiviert in Chrome
149 oder neuer `#enable-webmcp-testing` und `#devtools-webmcp-support` und ruft die registrierten
Tools im echten Tab auf.

Scheitert die Nutzung trotz unterstützter Version, korrekter Flags, Origin-/Permissions-
Konfiguration und behobener eigener Fehler an der Plattform, übernimmt eine OpenAI-Apps-SDK-
Integration den Agentenkanal. Sie verwendet einen MCP-Server, eine ChatGPT-iframe-UI und einen
eigenen Deployment- und Datenschutzvertrag. Beide Wege teilen dieselben Application Services.

Primärquellen:

- <https://developer.chrome.com/docs/ai/webmcp>
- <https://developer.chrome.com/blog/new-in-devtools-149>
- <https://developers.openai.com/apps-sdk/build/mcp-server>
- <https://developers.openai.com/apps-sdk/build/chatgpt-ui>
- <https://developers.openai.com/apps-sdk/deploy>

## D-023 — Vorgänger und img2svg Studio bleiben getrennte Produkte

**Status:** entschieden

`https://img2.download` bleibt der bestehende Vorgänger. Das neue img2svg Studio wird getrennt
auf `https://studio.img2.download` ausgeliefert. Beide Anwendungen erhalten ihre eigene
origin-isolierte WebMCP-Registrierung, ihr eigenes Capability-Inventar und ihren eigenen echten
Chrome-Smoke-Test. Damit bleiben DOM, Zustand und Deployment der Produkte klar getrennt.

## Verifiziert am 19. Juli 2026

- Chrome `150.0.7871.129` registriert mit aktivierten Test- und DevTools-Flags auf einer lokal
  origin-isolierten Seite erfolgreich ein Werkzeug über `document.modelContext`.
- `https://img2.download` antwortet erfolgreich und ist in Chrome bedienbar. Der aktuelle
  Produktionsstand sendet noch keinen `Origin-Agent-Cluster`-Header und registriert noch kein
  WebMCP-Werkzeug; MCP-03 ergänzt den Vorgänger gezielt.
