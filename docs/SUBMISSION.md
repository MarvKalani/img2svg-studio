# OpenAI Build Week — Einreichungsplan

Stand der Prüfung: 19. Juli 2026, 13:27 CEST.

## Frist

Die Submission Period endet am **21. Juli 2026 um 17:00 Pacific Time**. In Berlin entspricht
das **22. Juli 2026 um 02:00 CEST**. Nach Ende der Frist kann die Einreichung nicht mehr
inhaltlich geändert werden.

Offizielle Quellen:

- <https://openai.com/build-week/>
- <https://openai.devpost.com/>
- <https://openai.devpost.com/rules>

## Empfohlener Track

**Developer Tools** passt am besten: img2svg Studio ist ein lokales Werkzeug für Entwickler,
Designer und Browser-Agenten. WebMCP, reproduzierbare Konvertierung und der experimentelle
A/B-Workflow sind in diesem Track leichter als technische Produktleistung zu erklären.

Die Einreichung darf nur einen Track wählen. Der Projekteigner bestätigt die finale Auswahl.

## Pflichtbestandteile

- Ein funktionierendes Projekt, das während der Submission Period mit Codex und GPT-5.6
  gebaut oder wesentlich erweitert wurde.
- Auswahl genau einer Kategorie.
- Englische Projektbeschreibung mit Funktionen und Arbeitsweise.
- Öffentlich sichtbares YouTube-Demovideo unter drei Minuten.
- Audio im Video, das das Produkt sowie den konkreten Einsatz von Codex und GPT-5.6 erklärt.
- URL zu einem öffentlichen Repository mit passender Lizenz oder zu einem privaten Repository,
  das mit `testing@devpost.com` und `build-week-event@openai.com` geteilt wurde.
- README mit Setup, Beispielmaterial, Ausführung und Testweg.
- README-Abschnitt über Zusammenarbeit mit Codex, beschleunigte Arbeit und wichtige Produkt-,
  Engineering- und Designentscheidungen.
- `/feedback` Codex Session ID des Threads, in dem der Großteil der Kernfunktion gebaut wurde.
- Für Developer Tools: Installationsanleitung, unterstützte Plattformen und ein Testweg ohne
  lokalen Neubau, vorzugsweise eine frei zugängliche statische Demo.
- Alle Submission-Materialien auf Englisch oder mit vollständiger englischer Übersetzung.

## Regelrelevante Nachweise

Der aktuelle Git-Verlauf beginnt innerhalb der Submission Period. Für jeden Code- und
Dokumentations-Slice entsteht genau ein sauberer Commit. Das liefert den verlangten datierten
Nachweis der während des Hackathons entstandenen Arbeit.

Zusätzlich werden im README dokumentiert:

- Verwendung von GPT-5.6 Sol in Codex.
- Red–Green–Refactor und vertikale Slices.
- Entscheidungen zu `visioncortex`, WebMCP, Determinismus und lokalem Datenschutz.
- klare Trennung eigener Arbeit von Open-Source-Abhängigkeiten.

Der Großteil der Kernimplementierung sollte in diesem Codex-Thread bleiben, damit eine
aussagekräftige `/feedback` Session ID eingereicht werden kann.

## Bewertung

Die vier Kriterien sind gleich gewichtet:

- Technische Umsetzung und ernsthafter Einsatz von Codex.
- Vollständiges, kohärentes Design und Nutzererlebnis.
- Glaubwürdiger Nutzen für eine konkrete Zielgruppe.
- Kreativität und Eigenständigkeit der Idee.

Der kritische Umfang priorisiert deshalb ein kleines vollständiges Produkt vor vielen halben
Funktionen.

## Kritischer Produktumfang vor der Frist

### Muss funktionieren

1. Rust/WASM/Web-Gerüst mit TypeScript 7 und Qualitätsgates.
2. Bild laden, lokal in SVG konvertieren, anzeigen und herunterladen.
3. Deterministische Ausgabe und eigener messbarer Optimizer-Grundslice.
4. Mindestens zwei Runs mit History und Parameter-Diff im A/B-Vergleich.
5. Mindestens ein überzeugender nativer Shape-Slice, vorzugsweise Kreis.
6. WebMCP-Kern für Fähigkeiten, Konfiguration und Konvertierung.
7. Öffentliche statische Demo mit einem kleinen Beispielbild.
8. Englisches README, englische Submission-Beschreibung und Demo-Video.

### Nach der Einreichung

- vollständige Shape-Palette.
- MODNet und SAM.
- vollständige Modell-Registry und KI-Werkzeuge.
- CLI und zusätzliche Rasterformate, sofern sie den Kern vor der Frist gefährden.
- Run-Matrix, Gradienten und weitere Kür-Funktionen.

## Einreichungsreihenfolge

1. Sofort bei Devpost registrieren und „Join Hackathon“ abschließen.
2. GitHub-Repository und Lizenz festlegen, Remote hinzufügen und `main` pushen.
3. Kritischen Produktpfad in sauberen Slice-Commits umsetzen.
4. Statische Demo veröffentlichen und aus einem frischen Browser testen.
5. Englisches README und Submission-Texte finalisieren.
6. Demo-Video früh aufnehmen, öffentlich zu YouTube laden und Link prüfen.
7. `/feedback` Session ID dieses Kernthreads erzeugen.
8. Devpost-Entwurf vollständig ausfüllen und spätestens mehrere Stunden vor Frist absenden.
9. Eingereichte Links in einem nicht angemeldeten Browser gegenprüfen.

## Nicht durch Code lösbare Schritte

Diese Schritte benötigen den Projekteigner oder eine bestätigte angemeldete Sitzung:

- Devpost-Konto, Teilnahme und Zustimmung zu den offiziellen Regeln.
- finale Track- und Lizenzentscheidung.
- Freigabe des GitHub-Repositorys.
- Veröffentlichung des YouTube-Videos.
- endgültiges Absenden der Devpost-Einreichung.
