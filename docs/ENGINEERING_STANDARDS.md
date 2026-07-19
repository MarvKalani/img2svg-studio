# Engineering-Standards

Diese Regeln sind für menschliche und unbeaufsichtigte agentische Arbeit verbindlich. Sie
gelten vor persönlichen Vorlieben, Framework-Konventionen und opportunistischen Refactorings.

## 1. Leitprinzipien

### KISS

Die kleinste verständliche Lösung gewinnt. Neue Abstraktionen, Abhängigkeiten und
Konfigurationsschichten benötigen einen konkreten aktuellen Nutzen. Ein möglicher späterer
Nutzen reicht nicht.

### SINE — Simple Is Not Easy

Einfachheit ist ein Arbeitsergebnis, kein Verzicht auf Sorgfalt. Komplexität wird verstanden,
an der richtigen Grenze gekapselt und aus dem normalen Kontrollfluss entfernt. Kurzer Code ist
nicht automatisch einfacher Code.

### Minimalismus

- Nur das Verhalten implementieren, das der aktuelle Slice benötigt.
- Keine vorgezogenen Erweiterungspunkte, generischen Frameworks oder ungenutzten Optionen.
- Standardbibliothek und vorhandene Projektmittel vor neuen Abhängigkeiten prüfen.
- Tote Pfade, auskommentierter Code und spekulative TODOs werden nicht committed.
- Eine Abstraktion entsteht erst, wenn sie eine reale Wiederholung oder Grenze vereinfacht.

### Lösungsorientierung

Das Ziel ist ein funktionierendes Hackathon-MVP, kein theoretisch vollständiges System.
Probleme werden als Randbedingungen für die nächste konkrete Lösung behandelt, nicht als Grund,
die Arbeit einzustellen.

- Bei nicht wesentlichen Unklarheiten die beste reversible Annahme wählen und weiterarbeiten.
- Die naheliegendste kleine Lösung zuerst praktisch prüfen, statt lange Varianten zu sammeln.
- Nicht am ersten unvollkommenen Ergebnis stoppen; den aktuellen Slice bis zur Abnahme bringen.
- Eine funktionierende Lösung nicht wegen einer nur hypothetisch besseren Architektur verwerfen.
- Recherche und Fehlersuche auf die Entscheidung begrenzen, die den Slice tatsächlich blockiert.
- Nur pausieren, wenn neue Autorität nötig ist, eine irreversible Außenwirkung droht oder eine
  Entscheidung die Produktabsicht wesentlich verändern würde.

### Make it work, make it right, make it fast

Diese Reihenfolge ist verbindlich:

1. **Make it work:** Den kleinsten vollständigen Happy Path Ende zu Ende zum Laufen bringen.
2. **Make it right:** Typen, Fehlergrenzen, Tests, Namen und notwendige Randfälle bereinigen.
3. **Make it fast:** Nur gemessene Engpässe optimieren, wenn sie MVP oder Demo beeinträchtigen.

Jede Stufe bleibt im Umfang des aktuellen Slices. „Right“ bedeutet robust und verständlich,
nicht maximal abstrahiert. „Fast“ bedeutet ausreichend schnell für das definierte Szenario,
nicht vorsorglich auf jede denkbare Last optimiert.

## 2. Vertikale Slices

Arbeit wird als kleinstes sichtbares Ende-zu-Ende-Verhalten geschnitten. Ein Slice umfasst die
benötigten Schichten — beispielsweise Engine, WASM-Vertrag, UI und Test — statt zunächst eine
komplette horizontale Schicht auf Vorrat zu bauen.

Jeder Slice:

1. besitzt ein beobachtbares Ergebnis und klare Abnahmekriterien.
2. beginnt und endet in einem lauffähigen Zustand.
3. enthält nur die dafür notwendigen Änderungen.
4. aktualisiert Taskstatus und relevante Dokumentation.
5. wird als eigener, verständlicher Commit gesichert.

Fundamentale Gerüstarbeit ist erlaubt, wenn sie unmittelbar den ersten vertikalen Slice trägt.

## 3. TDD und schneller Feedbackzyklus

Für Verhalten gilt Red–Green–Refactor:

1. **Red:** Der kleinste relevante Test beschreibt das noch fehlende Verhalten und schlägt aus
   dem erwarteten Grund fehl.
2. **Green:** Die einfachste korrekte Implementierung macht diesen Test grün.
3. **Refactor:** Namen und Struktur werden nur verbessert, solange alle Tests grün bleiben.

Der innere Zyklus nutzt immer den schnellsten aussagekräftigen Test:

- pure Rust- oder TypeScript-Unit-Tests für Logik.
- Vertragstests für Rust/WASM- und Schema-Grenzen.
- kleine Integrationstests für echte Pipelines.
- wenige Browser-End-to-End-Tests nur für kritische Nutzerabläufe.

Während der Entwicklung laufen gezielte Tests. Vor dem Commit laufen die für den Slice
relevanten Paketsuiten und die schnellen globalen Qualitätsprüfungen. Die vollständige Suite
läuft an Meilenstein-Gates und in CI. Jeder Bugfix beginnt mit einem reproduzierenden
Regressionstest.

Tests prüfen Verhalten, nicht interne Implementierungsdetails. Große Snapshots werden nur
verwendet, wenn das Artefakt selbst der Vertrag ist, etwa eine kanonische SVG-Ausgabe.

## 4. EVA — Eingabe, Verarbeitung, Ausgabe

Code trennt die drei Phasen sichtbar:

- **Eingabe:** Daten an der Systemgrenze lesen, validieren und in typisierte Domänenwerte
  überführen.
- **Verarbeitung:** Mit validierten Werten möglichst rein und deterministisch arbeiten.
- **Ausgabe:** Ergebnis an einer klaren Grenze serialisieren, anzeigen oder speichern.

Eine Funktion soll nicht gleichzeitig unvalidierte Eingabe lesen, Domänenlogik ausführen und
Nebenwirkungen erzeugen. I/O bleibt an den Rändern; die Mitte bleibt klein und gut testbar.

## 5. Typen statt String-Parameter

- Geschlossene Wertemengen werden als Enums, Literal-Unions oder kleine Value Objects
  modelliert.
- IDs, Maße, Schwellenwerte und Formate erhalten sprechende Typen, wenn Verwechslungen real
  möglich sind.
- Freie Strings bleiben für echten Text, Dateinamen, SVG-Inhalt und externe Protokollgrenzen.
- `unknown` wird an Grenzen validiert; `any` ist in eigenem TypeScript-Code nicht zulässig.
- Mehrere bedeutungsarme Booleans in Funktionsaufrufen werden durch benannte Optionsobjekte
  oder Enums ersetzt.
- Typen dürfen KISS nicht in Wrapper-Bürokratie verwandeln. Ein neuer Typ muss einen Fehler
  verhindern oder eine Domänengrenze erklären.

## 6. Namen

- Code-Bezeichner sind englisch und beschreiben Rolle oder Absicht.
- Funktionen verwenden aktive Verben; Werte und Typen verwenden konkrete Substantive.
- Abkürzungen sind nur erlaubt, wenn sie in der Domäne allgemeingültig sind, etwa SVG, RGBA
  oder WASM.
- Generische Namen wie `data`, `item`, `value`, `manager`, `helper` oder `utils` werden nur in
  wirklich kleinem, eindeutigem Kontext verwendet.
- Maße und Einheiten stehen im Namen oder Typ, etwa `widthPixels` oder `durationMs`.

## 7. Kommentare und Dokumentation

Kommentare erklären **warum** eine nicht offensichtliche Entscheidung nötig ist, welche
Randbedingung gilt oder warum eine naheliegende Alternative nicht verwendet wird. Sie
wiederholen nicht den Code.

- Öffentliche Verträge dokumentieren Invarianten, Fehler und relevante Seiteneffekte.
- Sicherheits-, Lizenz-, Browser- und Determinismus-Workarounds nennen den Grund.
- Ein ungewöhnliches `unwrap`, eine Typausnahme oder Performance-Abkürzung benötigt eine
  lokale Begründung.
- TODOs enthalten eine Task-ID oder werden nicht committed.
- Veraltete Kommentare werden im selben Slice aktualisiert oder entfernt.

## 8. Fehler und Kontrollfluss

- Erwartbare Fehler sind typisiert und werden an der passenden Grenze übersetzt.
- Rust-Produktionscode verwendet kein unkommentiertes `unwrap()` oder `expect()`.
- TypeScript läuft mit `strict` und ohne unbegründete Non-null-Assertions.
- Enums und Literal-Unions werden erschöpfend behandelt.
- Fehlertexte für Nutzer bleiben verständlich; interne Details bleiben in strukturierten
  Diagnosen.
- Happy Path bleibt sichtbar; Guard Clauses vermeiden unnötige Verschachtelung.

## 9. Dateigröße und Module

- Jede handgeschriebene, committed Quell- oder Testdatei hat ein hartes Maximum von 1000
  physischen Zeilen.
- Ab 600 Zeilen wird aktiv geprüft, ob die Datei mehr als eine Verantwortung enthält.
- Normaler Zielbereich sind deutlich weniger als 400 Zeilen.
- Generierte oder fremde Quellen werden nicht manuell bearbeitet und möglichst nicht
  committed. Falls sie unvermeidbar sind, liegen sie klar getrennt und zählen nicht als
  Rechtfertigung für große eigene Dateien.
- CI prüft das 1000-Zeilen-Limit automatisch.

Eine Datei wird nach Verantwortung und Verhalten geteilt, nicht willkürlich nach Zeilenzahl.

## 10. Minimale Git-Diffs

- Vor jeder Arbeit werden `git status` und der relevante Bestand gelesen.
- Unverwandte Nutzeränderungen bleiben unangetastet.
- Keine nebenläufigen Umbenennungen, Formatierungswellen oder „Aufräumarbeiten“.
- Formatter laufen, dürfen aber bei einem Slice keine sachfremden Dateien verändern.
- Lockfiles ändern sich nur durch bewusst geänderte Abhängigkeiten.
- Vor dem Commit werden Diff, neue Dateien und Löschungen vollständig geprüft.
- Ein Commit enthält genau einen Slice oder eine klar abgegrenzte Dokumentationsentscheidung.
- Der Commit-Betreff folgt `type(TASK-ID): imperative summary`, beispielsweise
  `feat(M1-02): render default SVG conversion`.
- Wird ein Task zu groß für einen kohärenten Commit, wird der Task vor der Implementierung in
  kleinere Slices geteilt.
- Externe Aktionen ohne Repository-Änderung erhalten keinen künstlichen leeren Commit.
- Die datierte Slice-Historie wird für den Hackathon nicht ohne ausdrücklichen Grund gesquasht.

## 11. Abhängigkeiten und Performance

Eine neue Abhängigkeit benötigt:

1. einen konkreten Nutzen für den aktuellen Slice.
2. eine passende Lizenz und Browser-/WASM-Kompatibilität.
3. einen Vorteil gegenüber einer kleinen, verständlichen Eigenlösung.
4. eine feste Version im Lockfile.

Performance wird gemessen. Es gibt keine komplizierte Optimierung ohne reproduzierbaren
Benchmark oder sichtbares Problem. Der schnelle TDD-Zyklus selbst ist ein Qualitätsziel.

## 12. TypeScript

- Das Webprojekt pinnt TypeScript `7.0.2`, die am 19. Juli 2026 aktuelle stabile Version.
- Nightly- und Preview-Versionen sind nicht Teil reproduzierbarer Builds.
- `strict` wird explizit aktiviert, auch wenn TypeScript 7 es standardmäßig aktiviert.
- Weitere strenge Optionen werden einzeln gewählt, wenn sie reale Fehlerklassen verhindern.
- Compiler und Editor verwenden die Workspace-Version.
- Ein Versionsupdate ist ein eigener, getesteter Dependency-Slice.

TypeScript 7 ist der native Compiler-Port. Die Entscheidung beruht auf dem deutlich schnelleren
Build- und Editor-Feedback, nicht auf dem Wunsch, jede neue Sprachfunktion einzusetzen.

## 13. Definition of Done eines Slices

Ein Slice ist fertig, wenn:

- sein Verhalten durch einen zuerst fehlgeschlagenen Test oder eine begründete, dokumentierte
  Testausnahme beschrieben ist.
- die kleinste vollständige Implementierung vorliegt.
- relevante Tests, Formatierung, Typprüfung und Lints ohne Warnungen laufen.
- keine eigene Quell- oder Testdatei 1000 Zeilen überschreitet.
- der Diff nur notwendige Änderungen enthält.
- Namen, Typen und Kommentare diesen Regeln entsprechen.
- Taskstatus und betroffene Verträge aktuell sind.
- der Commit auch ohne Chatverlauf verständlich ist.
- der Slice den vereinbarten MVP-Nutzen tatsächlich Ende zu Ende liefert.
