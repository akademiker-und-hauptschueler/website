# 🎙️ Der Akademiker und der Hauptschüler - Die Website

![Website Badge](https://img.shields.io/badge/Website-DerAkademikerUndDerHauptschueler-blue)
![Status](https://img.shields.io/badge/Status-Aktiv-green)
![Sprache](https://img.shields.io/badge/Sprache-Deutsch-red)

## 📝 Beschreibung

Die Website für den Podcast "Der Akademiker und der Hauptschüler"

## 🏗️ Aufbau

Die Seite ist komplett statisch: kein CMS, keine Datenbank, kein Server-Code.

| Ordner | Inhalt |
|---|---|
| `docs/` | Die handgeschriebene Seite (HTML, CSS, JS, Bilder) |
| `content/posts/<slug>/` | Blog-Beiträge als Markdown (`index.md`) plus Grafiken |
| `scripts/build.mjs` | Baut `docs/` und die Beiträge zu statischem HTML in `_site/` |
| `.github/workflows/deploy.yml` | Baut bei jedem Push auf `main` und veröffentlicht `_site/` auf GitHub Pages |

## 📝 Einen Blog-Beitrag schreiben

1. Ordner `content/posts/<slug>/` anlegen (nur Kleinbuchstaben, Ziffern, Bindestriche) mit einer `index.md`:

   ```markdown
   ---
   title: "Titel des Beitrags"
   date: 2026-11-05
   summary: "Ein bis zwei Sätze für Übersicht und Suchmaschinen."
   episode: 45          # Nummer der Episodenkarte, bekommt einen "Hintergrund"-Link
   youtube: https://www.youtube.com/watch?v=...
   draft: true
   ---

   Text in Markdown, Tabellen und Bilder (`![Beschreibung](grafik.svg)`) inklusive.
   ```

2. Grafiken (SVG/PNG) in denselben Ordner legen und relativ einbinden.
3. Lokal ansehen (Entwürfe inklusive):

   ```bash
   npm ci
   npm run preview
   python3 -m http.server 8766 --directory _site
   ```

4. **Veröffentlichen erst nach dem Video:** `youtube` eintragen, `draft: false` setzen, pushen.
   Der Build bricht ab, wenn ein veröffentlichter Beitrag keinen YouTube-Link hat.
   Beiträge mit `draft: true` oder einem Datum in der Zukunft erscheinen nicht auf der Seite.

> ⚠️ Das Repository ist öffentlich: Entwürfe erscheinen nicht auf der Webseite, sind aber im Quelltext auf GitHub lesbar.

## 📄 Lizenz

Dieses Projekt steht unter der [GPL v3 Lizenz](LICENSE) - siehe LICENSE Datei für Details.

---

**🎧 Bleib neugierig, bleib am Ball!**