# Entscheidungsprotokoll

Dieses Dokument hält verbindliche Entscheidungen fest. Änderungen erhalten einen neuen
Eintrag oder markieren einen alten Eintrag ausdrücklich als ersetzt.

## D-001 — Local-first ohne Anwendungs-Backend

**Status:** entschieden

Bildverarbeitung und Konvertierung laufen im Browser. Es gibt keine Upload-API, Telemetrie
oder Nutzerkonten. Optionale Modell-Downloads sind sichtbar und werden separat behandelt.

## D-002 — `visioncortex` als Fundament

**Status:** entschieden

Clustering und rohes Tracing verwenden `visioncortex` als reguläre Abhängigkeit. Die eigene
Leistung liegt in Konfiguration, Detektoren, PathOptimizer, SVG-Assembly, Vergleichsworkflow,
KI-Werkzeugen, WebMCP und UI. Abhängigkeit und Lizenz werden transparent genannt.

## D-003 — Formerkennung als optionale Schicht

**Status:** entschieden; ersetzt die starre Trennung in Pure und Smart

Die robuste Pfad-Pipeline bleibt immer verfügbar. Native Formen werden global und pro Typ
aktiviert. Presetnamen dürfen „Smart“ verwenden, die Engine modelliert jedoch einzelne
Fähigkeiten statt zweier unflexibler Welten.

## D-004 — Sichere Reststrategie

**Status:** entschieden

Nicht erkannte Inhalte bleiben standardmäßig optimierte Pfade. `ignore` und eingebettetes
Raster sind explizite Alternativen; Hybrid-SVGs werden sichtbar gekennzeichnet.

## D-005 — Web-Stack

**Status:** entschieden

Vite und TypeScript ohne schweres UI-Framework. Das reduziert Abhängigkeiten und hält Canvas-,
Worker- und WebMCP-Integration direkt kontrollierbar. Diese Entscheidung darf überprüft
werden, falls das UI dadurch nachweislich schwerer wartbar wird.

## D-006 — Rust-Workspace

**Status:** entschieden

Core, WASM-Binding und CLI werden getrennte Crates. Die Core-Engine bleibt browserunabhängig
und wird von WASM und CLI gleichermaßen verwendet.

## D-007 — WebMCP als progressive Erweiterung

**Status:** entschieden

Die Anwendung funktioniert vollständig ohne WebMCP. Ein Adapter nutzt Feature Detection und
die aktuelle `document.modelContext`-API. Tool-Aufrufe und UI verwenden dieselben Services.
Ein sichtbarer Browser-Tab gehört zum vorgesehenen Agentenablauf.

## D-008 — Größenmodell

**Status:** entschieden

Unverändert, Prozent, eigene Maße, Icon-Presets und HD/FHD/QHD/UHD sind Teil des Produkts.
Das Seitenverhältnis ist standardmäßig gesperrt. KI-Upscaling folgt erst nach einem stabilen
konventionellen Resampling.

## D-009 — Lizenz des eigenen Projekts

**Status:** offen, blockiert Veröffentlichung und Einreichung, nicht die lokale Entwicklung

Ausgangswunsch ist BSL 1.1 mit späterem Wechsel zu Apache 2.0. Falls die Hackathon-Regeln eine
OSI-Lizenz verlangen, soll die Einreichung direkt Apache 2.0 verwenden. Vor Veröffentlichung
müssen die konkreten Regeln und die Entscheidung des Lizenzgebers dokumentiert werden.

## D-010 — Binäre Eingabe für Browser-Agenten

**Status:** entschieden für MVP

Lokale Bilddateien werden über die sichtbare Datei-/Drop-Oberfläche geladen. WebMCP übernimmt
Konfiguration, Konvertierung, Vergleich und Export nach dem Laden. Dadurch bleiben binäre
Daten außerhalb großer JSON-Tool-Aufrufe. Ein Agent kann eine lokal erzeugte Datei über den
Browser auswählen.

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

## Noch zu klären

- Welche Chrome-Version und welcher WebMCP-Aktivierungsweg sind für die Demo verbindlich?
- Welche zusätzlichen Rasterexporte sind neben PNG und WebP im Zielbrowser sinnvoll?
