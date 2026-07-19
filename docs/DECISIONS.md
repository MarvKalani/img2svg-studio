# Entscheidungsprotokoll

Dieses Dokument hält verbindliche Entscheidungen fest. Änderungen erhalten einen neuen
Eintrag oder markieren einen alten Eintrag ausdrücklich als ersetzt.

## D-001 — Local-first ohne Anwendungs-Backend

**Status:** entschieden

Bildverarbeitung und Konvertierung laufen im Browser. Es gibt keine Upload-API, Telemetrie
oder Nutzerkonten. Optionale Modell-Downloads sind sichtbar und werden separat behandelt.

## D-002 — `visioncortex` als Fundament

**Status:** entschieden; Submission-Umfang durch D-020 präzisiert

Clustering und rohes Tracing verwenden `visioncortex` als reguläre Abhängigkeit. Die eigene
Leistung liegt in typisierter Konfiguration, Detektoren, deterministischer SVG-Assembly,
Vergleichsworkflow, KI-Werkzeugen, WebMCP und UI. Abhängigkeit und Lizenz werden transparent
genannt. Ein eigener PathOptimizer ist nicht Bestandteil des Submission-MVP.

## D-003 — Formerkennung als optionale Schicht

**Status:** entschieden; ersetzt die starre Trennung in Pure und Smart

Die robuste Pfad-Pipeline bleibt immer verfügbar. Native Formen werden global und pro Typ
aktiviert. Die Engine modelliert einzelne Fähigkeiten statt zweier unflexibler Modi.

## D-004 — Sichere Reststrategie

**Status:** durch D-020 für den Submission-MVP ersetzt

Nicht erkannte Inhalte bleiben immer Pfade. `ignore` und eingebettetes Raster gehören nicht
zum Submission-Umfang.

## D-005 — Web-Stack

**Status:** entschieden

Vite und TypeScript ohne schweres UI-Framework. Das reduziert Abhängigkeiten und hält Canvas-,
Worker- und WebMCP-Integration direkt kontrollierbar. Diese Entscheidung darf überprüft
werden, falls das UI dadurch nachweislich schwerer wartbar wird.

## D-006 — Rust-Workspace

**Status:** entschieden; CLI durch D-020 entfernt

Core und WASM-Binding werden getrennte Crates. Die Core-Engine bleibt browserunabhängig. Eine
CLI gehört nicht zum Submission-MVP.

## D-007 — WebMCP als progressive Erweiterung

**Status:** entschieden

Die Anwendung funktioniert vollständig ohne WebMCP. Ein Adapter nutzt Feature Detection und
die aktuelle `document.modelContext`-API. Tool-Aufrufe und UI verwenden dieselben Services.
Ein sichtbarer Browser-Tab gehört zum vorgesehenen Agentenablauf.

## D-008 — Größenmodell

**Status:** durch D-020 für den Submission-MVP ersetzt

Die Submission unterstützt unveränderte Größe und proportionale Skalierung von 10 bis 400
Prozent. Freie Maße, Größenpresets und KI-Upscaling werden nicht beworben.

## D-009 — Lizenz des eigenen Projekts

**Status:** offen, blockiert Veröffentlichung und Einreichung, nicht die lokale Entwicklung

Ausgangswunsch ist BSL 1.1 mit späterem Wechsel zu Apache 2.0. Falls die Hackathon-Regeln eine
OSI-Lizenz verlangen, soll die Einreichung direkt Apache 2.0 verwenden. Vor Veröffentlichung
müssen die konkreten Regeln und die Entscheidung des Lizenzgebers dokumentiert werden.

## D-010 — Binäre Eingabe für Browser-Agenten

**Status:** entschieden; Toolumfang durch D-020 präzisiert

Lokale Bilddateien werden über die sichtbare Datei-/Drop-Oberfläche geladen. WebMCP übernimmt
Konfiguration und Konvertierung nach dem Laden. Dadurch bleiben binäre Daten außerhalb großer
JSON-Tool-Aufrufe. Vergleich und Export bleiben im Submission-MVP sichtbare Nutzeraktionen.

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

## D-017 — Keine bewertbare Entwicklungsphase nach der Deadline

**Status:** entschieden

Die in den Regeln genannten Stufen eins und zwei sind Bewertungsstufen, keine Gelegenheit zur
Weiterentwicklung. Nach Ende der Submission Period darf die Einreichung inhaltlich nicht mehr
geändert werden. Jede gegenüber der Jury beworbene Funktion muss deshalb vorher funktionieren,
getestet, dokumentiert und deployed sein. Unfertige optionale Ideen werden nicht als vorhandene
Funktionen dargestellt.

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

Die frühere Roadmap enthielt über den fokussierten Hackathon-MVP hinaus unter anderem Presets,
Rasterexporte, CLI, eigene Pfadoptimierung und zusätzliche Vorverarbeitung. Diese Funktionen
werden nicht in eine hypothetische Phase nach der Einreichung verschoben und auch nicht
beworben. Verbindlich sind ausschließlich die offenen Slices in `TASKS.md`; Produkt- und
Technikspezifikation beschreiben denselben Umfang. Neue Funktionen benötigen vor der
Implementierung einen eigenen vollständigen Taskvertrag.

## Noch zu klären

- Welche Chrome-Version und welcher WebMCP-Aktivierungsweg sind für die Demo verbindlich?
