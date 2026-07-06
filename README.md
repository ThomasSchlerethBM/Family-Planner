# Familientafel

Familien-Planer: Kalender + Aufgaben mit Punktesystem, live synchronisiert über
Firebase Realtime Database. Gleicher Aufbau wie deine Tennis-App: React + Vite,
gehostet auf GitHub Pages.

## 1. Lokal einrichten

```bash
npm install
```

## 2. Eigenes Firebase-Projekt anlegen

1. https://console.firebase.google.com → "Projekt hinzufügen"
2. Im Projekt: **Build → Realtime Database → Datenbank erstellen** (nicht Firestore!)
   Modus zunächst "Testmodus" (später Regeln verschärfen, siehe unten)
3. Projekteinstellungen → "Meine Apps" → Web-App hinzufügen → Config kopieren
4. Config in `src/firebase.js` eintragen (die Platzhalter ersetzen)

### Empfohlene Sicherheitsregeln (später, statt Testmodus)

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Das ist bewusst offen gehalten (kein Login-System in dieser Version) – für den
internen Familiengebrauch über einen "geheimen" Firebase-Projektnamen meist
ausreichend. Für mehr Schutz später Firebase Auth ergänzen.

## 3. Admin-PIN setzen

In `src/App.jsx` ganz oben:

```js
const ADMIN_PIN = '1234';
```

Auf eine eigene PIN ändern, bevor du live gehst.

## 4. Lokal testen

```bash
npm run dev
```

## 5. Auf GitHub Pages veröffentlichen (wie die Tennis-App)

1. Neues GitHub-Repo anlegen, z. B. `Family-Planner-App`
2. In `vite.config.js` den `base`-Pfad an den Repo-Namen anpassen:
   ```js
   base: '/Family-Planner-App/',
   ```
3. Projekt pushen:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/DEIN_USERNAME/Family-Planner-App.git
   git push -u origin main
   ```
4. Deployen:
   ```bash
   npm run deploy
   ```
   Das baut die App und veröffentlicht den `dist`-Ordner auf dem `gh-pages`-Branch.
5. In den Repo-Einstellungen unter **Pages** den Branch `gh-pages` als Quelle wählen.
6. App ist danach erreichbar unter:
   `https://DEIN_USERNAME.github.io/Family-Planner-App/`

## Funktionen

- Ansichten: Nur Kalender / Nur Aufgaben / Beides × Tag / Woche / Monat / Jahr
- Personenfilter mit Farben
- Standard- vs. Sondertermine
- Tägliche Routineaufgaben (automatischer Reset pro Kalendertag) und einmalige Aufgaben
- Punktesystem pro Person + einlösbare Prämien
- Google-Kalender-Import per ICS-Text-Einfügen (Export aus Google Kalender → Datei öffnen → Inhalt einfügen)
- Admin-PIN schaltet das Anlegen/Löschen von Terminen, Aufgaben und Prämien frei;
  Abhaken und Prämien einlösen geht immer, ohne PIN

## Mögliche nächste Ausbaustufen

- Eigene App-Icons für das Manifest (aktuell leer) → z. B. 192×192 und 512×512 PNG in `public/`
- Firebase Auth statt offener Schreibrechte
- QR-Code-Kiosk-Modus für ein Tablet in der Küche (analog zur Tennis-App)
- Echte Google-Calendar-API-Anbindung (OAuth) statt ICS-Import
