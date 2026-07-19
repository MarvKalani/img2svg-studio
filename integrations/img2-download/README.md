# img2.download WebMCP-Adapter

Dieser Ordner enthält den getrennten, deploybaren Ersatz für den am 19. Juli 2026 auf
`https://img2.download/js/webmcp.js` ausgelieferten Adapter.

Deployment in das Quellprojekt des Vorgängers:

1. `webmcp.js` nach `js/webmcp.js` übernehmen.
2. `_headers` in das statische Auslieferungsverzeichnis übernehmen oder dieselben Header in
   Cloudflare konfigurieren.
3. Service-Worker-Cacheversion erhöhen, damit Chrome den neuen Adapter lädt.
4. `https://img2.download/app` in Chrome 150 mit aktivierten WebMCP-Flags neu öffnen und unter
   „Application · WebMCP“ alle elf Werkzeuge prüfen.

Der Adapter verwendet ausschließlich `document.modelContext`, eng begrenzte Schemas und die
vorhandenen UI-/Anwendungsdienste. Der alte URL-Fetch entfällt: Lokale Dateien gelangen weiterhin
nur über die vom Nutzer bestätigte Datei- oder Drop-Oberfläche in die Queue.

Der Adapter ist im lokalen Quellprojekt `marvins-image-converter` als Commit `e386756` übernommen.
Commit `e739a54` ergänzt den zuvor fehlenden reproduzierbaren Cloudflare-Build: `npm ci`, sechs
Tests und `npm run build` erzeugen ausschließlich öffentliche Assets unter `dist`. Dieser Output
bestand in Chrome 150 Dateiübergabe, SVG-Vorschau und einen realen 647-Byte-Download ohne
Konsolenfehler. Der Produktionsstand ändert sich erst nach Push und Cloudflare-Deployment; dafür
fehlt auf diesem Rechner noch die GitHub-Anmeldung.
