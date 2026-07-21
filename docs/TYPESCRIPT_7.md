# TypeScript-7-Entscheidungen

Stand: 21. Juli 2026. Dieses Dokument erklärt bewusst ungewöhnliche Compileroptionen und
Typannotationen. Sie gehören zur Build-Architektur und sollen bei Reviews nicht als überflüssig
entfernt werden.

## Verwendeter Stand

Das Repository pinnt TypeScript `7.0.2`, die am 8. Juli 2026 aktuelle stabile Fassung. Seit
TypeScript 7 ist `tsc` der native, in Go implementierte Compiler. Das npm-Paket startet das zur
Plattform passende Binärprogramm; `@typescript/native-preview` oder ein TypeScript-6-Alias werden
nicht benötigt. Der Compiler arbeitet beim Parsen, Prüfen und Ausgeben parallel und verwendet eine
deterministische Typreihenfolge.

TypeScript 7 besitzt noch keine stabile programmatische Compiler-API. img2svg importiert daher
keine Compiler-Interna und verwendet ausschließlich CLI, `tsconfig.json` und den LSP-basierten
Editorbetrieb.

Offizielle Quellen:

- [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript 6.0 migration and ES2025 changes](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [Official TypeScript performance guidance](https://github.com/microsoft/TypeScript/wiki/Performance)

## Verwendete TS-7-Verträge

| Einstellung | Entscheidung und Grund |
|---|---|
| `module: ESNext`, `moduleResolution: Bundler` | Die Browser-App und der MCP-Server bleiben native ESM-Projekte ohne ältere Node-Auflösung. |
| `moduleDetection: force` | Jede Datei wird eindeutig als Modul behandelt; globale Skriptzustände entstehen nicht versehentlich. |
| `strict` und `noUncheckedSideEffectImports` | Anwendungsquellen und reine Seiteneffektimporte werden vollständig geprüft. |
| `types: ["node"]` | TS 7 lädt globale `@types` standardmäßig nicht mehr automatisch. Benötigte Node-Typen sind deshalb explizit. |
| `libReplacement: false` | Verhindert unnötige Suchen nach ersetzenden Standardbibliotheken. |
| `erasableSyntaxOnly` | Der Code verwendet nur TypeScript-Syntax, die ohne Runtime-Transformation entfernt werden kann; keine Enums oder Namespaces als versteckte JavaScript-Ausgabe. |
| `verbatimModuleSyntax` | `import type` bleibt eine überprüfbare Grenze; Laufzeitimporte werden nicht still umgeschrieben. |
| `isolatedDeclarations` im MCP | Exportierte APIs besitzen genügend Annotationen, um Deklarationen dateiweise und parallel erzeugen zu können. |
| `skipLibCheck` | Überspringt nur die erneute Prüfung externer `.d.ts`-Dateien. Der eigene Code bleibt streng geprüft. |

`DOM.Iterable` steht nicht mehr separat in der Web-Konfiguration, weil TypeScript 6 dessen Inhalt
vollständig in `DOM` aufgenommen hat. `target` und `lib` bleiben bewusst auf `ES2024`: Der
TypeScript-Compiler ist aktuell, aber der veröffentlichte Browsercode und der Node-22-MCP sollen
keine ES2025- oder `esnext`-Runtime-APIs wie `RegExp.escape`, `Promise.try` oder `Temporal`
voraussetzen, bevor die unterstützten Laufzeiten dies erlauben.

## Warum manche Exporttypen ausgeschrieben sind

`isolatedDeclarations` verlangt für öffentliche Werte eine lokale, ohne projektweite Inferenz
verständliche Signatur. Deshalb tragen `VectorizeMode`, `DetailLevel` und `previewWidgetHtml`
explizite Typannotationen. Diese Annotationen sind kein Stilrest: Sie halten den MCP-Vertrag
parallel ausgebbar und verhindern, dass interne Implementierungsdetails in `.d.ts`-Dateien
einsickern.

## Gemessene Parallelisierung

Gemessen wurde auf dem Mac mini M4 mit `tsc -b --force` über Root, Web und MCP. Je Konfiguration
liefen fünf Wiederholungen; angegeben ist der Median. Die experimentellen TS-7-Schalter werden
nicht fest eingetragen, weil die automatische Einstellung in diesem kleinen Workspace schneller
ist.

| Konfiguration | Median |
|---|---:|
| TS-7-Automatik nach Konfigurationsbereinigung | 123,3 ms |
| `--checkers 2 --builders 2` | 127,6 ms |
| `--checkers 4 --builders 1` | 152,1 ms |
| `--checkers 1 --builders 1` | 195,8 ms |
| Ausgangskonfiguration vor diesem Slice | 520,2 ms |

Die Start- und Prozesskosten dominieren hier. Mehr Checker helfen erst bei deutlich größeren
Projekten und erhöhen den Speicherbedarf. `typecheck` bleibt deshalb ohne experimentelle
Parallelitätsflags; `typecheck:watch` nutzt den in TypeScript 7 neu gebauten nativen Dateiwächter.

## Regeln für Erweiterungen

1. Öffentliche MCP-Werte behalten explizite Exporttypen, wenn `isolatedDeclarations` sie verlangt.
2. Reine Typimporte werden mit `import type` geschrieben.
3. Keine TypeScript-Enums, Namespaces oder andere nicht direkt löschbare Syntax einführen.
4. `--checkers` und `--builders` nur nach einem neuen Benchmark ändern.
5. Neue ES2025-/`esnext`-APIs erst nach einer bewussten Änderung der Browser- und Node-Mindestziele
   verwenden.
6. Bei einem TypeScript-Upgrade zuerst die stabile npm-Version pinnen und danach `npm run check`
   sowie den erzwungenen Drei-Projekt-Benchmark ausführen.
