# Familientafel

Familien-Planer: Kalender + Aufgaben mit Punktesystem, live synchronisiert über
Firebase Realtime Database. Gleicher Aufbau wie deine Tennis-App: React + Vite,
gehostet auf GitHub Pages.

## Funktionen

- Ansichten: Nur Kalender / Nur Aufgaben / Beides × Tag / Woche / Monat / Jahr
- Personenfilter mit Farben
- Standard- vs. Sondertermine
- Tägliche Routineaufgaben (automatischer Reset pro Kalendertag) und einmalige Aufgaben
- Punktesystem pro Person + einlösbare Prämien
- Google-Kalender-Import per ICS-Text-Einfügen (Export aus Google Kalender → Datei öffnen → Inhalt einfügen)
- Admin-PIN schaltet das Anlegen/Löschen von Terminen, Aufgaben und Prämien frei;
  Abhaken und Prämien einlösen geht immer, ohne PIN
- **Familie verwalten** (im Admin-Modus, in der rechten Seitenleiste): Namen der
  Familienmitglieder direkt umbenennen oder neue hinzufügen
- **Kiosk-Modus**: Admin-Button "🖥️ Kiosk-Modus" zeigt einen QR-Code, der eine
  vereinfachte Vollbild-Ansicht öffnet (nur heutige Termine & Aufgaben, große
  Schrift, kein Admin-Zugriff) – ideal für ein Tablet in der Küche
- Eigenes App-Icon (Klemmbrett mit Punkte-Münze) für Homescreen/Manifest

## Familienmitglieder umbenennen

1. Oben rechts auf **Admin 🔒** klicken, PIN eingeben
2. In der rechten Seitenleiste erscheint die Karte **👪 Familie verwalten**
3. Namen im Textfeld ändern (z. B. "Kind 2" → "Liz", "Mama" → "Tina", "Papa" → "Thomas")
4. Bei jeder Zeile auf **Speichern** klicken (oder Enter drücken)

Die Änderung wird sofort über Firebase an alle Geräte synchronisiert.

## Kiosk-Modus einrichten

1. Im Admin-Modus auf **🖥️ Kiosk-Modus** klicken
2. QR-Code mit dem Tablet/Handy in der Küche scannen, oder Link manuell öffnen
   (Format: `https://DEIN_USERNAME.github.io/Family-Planner/?kiosk=1`)
3. Auf dem Tablet den Browser in den Vollbildmodus schalten bzw. die Seite zum
   Homescreen hinzufügen, damit es wie eine eigene App aussieht

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

- Firebase Auth statt offener Schreibrechte
- Echte Google-Calendar-API-Anbindung (OAuth) statt ICS-Import
