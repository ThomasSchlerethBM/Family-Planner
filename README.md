# Family Planner

Familien-Planer: Kalender + Aufgaben mit Punktesystem, live synchronisiert über
Firebase Realtime Database. Gleicher Aufbau wie deine Tennis-App: React + Vite,
gehostet auf GitHub Pages.

## Funktionen

- Ansichten: Nur Kalender / Nur Aufgaben / Beides × Tag / Woche / Monat / Jahr
- Personenfilter mit Farben
- Standard- vs. Sondertermine
- Tägliche Routineaufgaben (automatischer Reset pro Kalendertag) und einmalige Aufgaben
- Punktesystem pro Person + einlösbare Prämien
- **Punkte manuell anpassen** (Admin-Seitenleiste "⚖️ Punkte anpassen") – z. B. für
  Sonderboni oder Korrekturen, unabhängig vom Abhaken
- **Termine & Aufgaben bearbeiten**: im Admin-Modus auf einen Termin/eine Aufgabe
  klicken öffnet den Bearbeiten-Dialog (statt nur Löschen)
- Google-Kalender-Import per ICS-Text-Einfügen, sowie **echte OAuth-Anbindung**
  mehrerer Google-Konten (siehe eigener Abschnitt unten) – editierbare/sperrbare
  Google-Termine, damit manuelle Änderungen nicht beim nächsten Sync überschrieben werden
- Admin-PIN schaltet das Anlegen/Löschen/Bearbeiten frei; Abhaken und Prämien
  einlösen geht immer, ohne PIN
- **Familie verwalten**: Namen der Familienmitglieder umbenennen oder neue hinzufügen
- **Aufgaben-Icons**: jede Aufgabe hat ein Emoji-Icon (frei wählbar), damit auch
  Kinder, die noch nicht lesen können, die Aufgaben erkennen
- **Kiosk-Modus mit Personen-Auswahl**: QR-Code für die komplette Familie oder
  für eine Auswahl (z. B. nur Tim, oder Tim + Liz) – ideal für ein Tablet im Kinderzimmer
- Eigenes App-Icon für Homescreen/Manifest
- Design im Stil von Structured.app: helles Theme, farbige abgerundete Karten,
  Zeitleisten-Optik in der Tagesansicht

## Punkte manuell anpassen

Admin-Modus → Seitenleiste **⚖️ Punkte anpassen**: Person auswählen, Punktzahl
und optional einen Grund eintragen, dann **+ Gutschreiben** oder **− Abziehen**.
Wird sofort im Punktestand berücksichtigt, unabhängig von abgehakten Aufgaben.

## Termine und Aufgaben bearbeiten

Im Admin-Modus einfach auf einen Termin oder eine Aufgabe klicken (nicht auf
die Checkbox oder das ✕) → der Bearbeiten-Dialog öffnet sich mit den aktuellen
Werten vorausgefüllt.

Bei Terminen, die aus einem verbundenen Google-Kalender stammen: Der Dialog
zeigt einen Hinweis und eine Checkbox **🔒 Sperren**. Ohne Sperre überschreibt
der nächste automatische Sync (alle 15 Minuten) deine Änderungen wieder mit dem
Original aus Google. Mit Sperre bleiben deine Anpassungen erhalten. Über
**🚫 Dauerhaft entfernen & aus Google-Sync ausschließen** verschwindet ein
Google-Termin endgültig aus der Family Planner (z. B. für Termine, die euch
nicht interessieren) – er wird auch bei künftigen Syncs nicht mehr importiert.

## Aufgaben-Icons

Beim Anlegen/Bearbeiten einer Aufgabe steht eine Auswahl gängiger Emoji-Icons
zur Verfügung, oder ein eigenes Emoji lässt sich frei eintragen. Icons
erscheinen in allen Ansichten sowie groß im Kiosk-Modus, damit auch Kinder,
die noch nicht lesen können, ihre Aufgaben erkennen.

## Kiosk-Modus einrichten

1. Admin-Modus → **🖥️ Kiosk-Modus** klicken
2. Familienmitglieder auswählen/abwählen, für die diese Kiosk-Ansicht gelten
   soll (z. B. nur Tim, oder Tim + Liz für ein gemeinsames Kinderzimmer-Tablet;
   alle ausgewählt = ganze Familie)
3. QR-Code mit dem jeweiligen Tablet/Handy scannen, oder Link manuell öffnen
4. Auf dem Tablet den Browser in den Vollbildmodus schalten bzw. die Seite zum
   Homescreen hinzufügen, damit es wie eine eigene App aussieht

### Profile für Knopfdruck-Wechsel im Kiosk-Modus

Im selben Dialog lässt sich eine Auswahl zusätzlich **als Profil speichern**
(Name eintragen, z. B. "Eltern", dann "💾 Speichern"). Diese Profile erscheinen
danach als Knöpfe direkt oben im Kiosk-Modus – man kann also z. B. auf einem
gemeinsamen Küchentablet per Fingertipp zwischen "Alle", "Eltern", "Tim", "Liz"
und "Kinder" wechseln, ohne erneut einen QR-Code zu scannen.

Beim ersten Start sind bereits vier Profile vorbereitet: **Eltern** (Tina +
Thomas), **Tim**, **Liz**, **Kinder** (Tim + Liz). Weitere lassen sich beliebig
ergänzen oder über das ✕ neben dem Profil im selben Dialog wieder löschen.

### Punkte-Ansicht im Kiosk-Modus

Oben im Kiosk-Modus zwischen **📅 Heute** und **🏆 Punkte** umschalten. Die
Punkte-Ansicht zeigt für jede aktuell ausgewählte Person eine Säule: Füllstand
= aktueller Punktestand, kleine Striche markieren die Kosten der angelegten
Prämien, darunter steht "noch X Punkte bis '<nächste Prämie>'".

### Aktualisieren-Knopf

Der 🔄-Knopf oben rechts im Kiosk-Modus lädt die Seite neu – praktisch, falls
die Live-Synchronisation im Hintergrund einmal hakt oder eine neue Version der
App deployed wurde.

## Familienmitglieder umbenennen

Jedes Familienmitglied kann sein eigenes Google-Konto verbinden; die Termine
werden automatisch alle 15 Minuten abgeglichen und für alle sichtbar in die
Family Planner übernommen (read-only, es wird nichts in Google geändert).

### Einmalige Einrichtung in der Google Cloud Console

1. https://console.cloud.google.com → Projekt anlegen (oder vorhandenes nutzen)
2. **APIs & Dienste → Bibliothek** → "Google Calendar API" suchen → **Aktivieren**
3. **APIs & Dienste → OAuth-Zustimmungsbildschirm**:
   - Nutzertyp: **Extern**
   - App-Name z. B. "Family Planner", eigene E-Mail als Support-Kontakt
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
- Reine Leserechte – Termine lassen sich nicht aus der Family Planner heraus in
  Google anlegen (dafür weiterhin den "+ Termin"-Button nutzen, der bleibt lokal)

Der bisherige ICS-Text-Import bleibt als Alternative bestehen, z. B. für
Kalender, die nicht über ein Google-Konto laufen.

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

## Mögliche nächste Ausbaustufen

- Firebase Auth statt offener Schreibrechte
- Zeitlich präzise Minuten-Timeline (aktuell: Reihenfolge nach Uhrzeit, aber ohne exakte Positionierung nach Dauer)
