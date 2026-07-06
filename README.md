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

## Google-Kalender direkt verbinden (mehrere Konten)

Jedes Familienmitglied kann sein eigenes Google-Konto verbinden; die Termine
werden automatisch alle 15 Minuten abgeglichen und für alle sichtbar in die
Familientafel übernommen (read-only, es wird nichts in Google geändert).

### Einmalige Einrichtung in der Google Cloud Console

1. https://console.cloud.google.com → Projekt anlegen (oder vorhandenes nutzen)
2. **APIs & Dienste → Bibliothek** → "Google Calendar API" suchen → **Aktivieren**
3. **APIs & Dienste → OAuth-Zustimmungsbildschirm**:
   - Nutzertyp: **Extern**
   - App-Name z. B. "Familientafel", eigene E-Mail als Support-Kontakt
   - Unter **Testnutzer**: die Gmail-Adressen aller Familienmitglieder eintragen,
     die ihren Kalender verbinden sollen (im Testmodus reicht das für bis zu
     100 Nutzer – keine Google-Prüfung nötig, keine Kosten)
4. **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → OAuth-Client-ID**:
   - Anwendungstyp: **Webanwendung**
   - Autorisierte JavaScript-Quellen:
     - `https://thomasschlerethbm.github.io`
     - `http://localhost:5173` (für lokales Testen)
   - Erstellen → die angezeigte Client-ID kopieren (endet auf `.apps.googleusercontent.com`)
5. Client-ID in `src/googleCalendar.js` eintragen:
   ```js
   export const GOOGLE_CLIENT_ID = 'DEINE_CLIENT_ID.apps.googleusercontent.com';
   ```

### Nutzung in der App

In der Seitenleiste unter **🔗 Google-Kalender**: bei der jeweiligen Person auf
**Verbinden** klicken → Google-Login-Popup erscheint → Kalenderzugriff (nur
Lesen) bestätigen. Danach erscheinen die Termine dieser Person automatisch als
Sondertermine (mit "G"-Kennzeichen) in allen Ansichten.

**Einschränkungen dieser reinen Browser-Lösung:**
- Die Berechtigung läuft technisch bedingt nach kurzer Zeit ab; die App
  versucht automatisch eine stille Erneuerung, manchmal ist aber ein erneuter
  Klick auf "Verbinden" nötig
- Es werden nur Termine der nächsten ~4 Monate und der letzten 7 Tage geholt
- Reine Leserechte – Termine lassen sich nicht aus der Familientafel heraus in
  Google anlegen (dafür weiterhin den "+ Termin"-Button nutzen, der bleibt lokal)

Der bisherige ICS-Text-Import bleibt als Alternative bestehen, z. B. für
Kalender, die nicht über ein Google-Konto laufen.

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
