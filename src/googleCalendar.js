// ------------------------------------------------------------------
// Google Calendar Integration (Client-seitig, kein eigener Server nötig)
//
// Setup (einmalig, in der Google Cloud Console):
// 1. https://console.cloud.google.com -> Projekt anlegen (oder vorhandenes nutzen)
// 2. "APIs & Dienste" -> "Bibliothek" -> "Google Calendar API" aktivieren
// 3. "APIs & Dienste" -> "OAuth-Zustimmungsbildschirm" einrichten:
//    - Nutzertyp: "Extern"
//    - Unter "Testnutzer" die Gmail-Adressen aller Familienmitglieder eintragen
//      (im Testmodus reicht das für bis zu 100 Nutzer, keine Google-Prüfung nötig)
// 4. "APIs & Dienste" -> "Anmeldedaten" -> "Anmeldedaten erstellen" ->
//    "OAuth-Client-ID" -> Anwendungstyp "Webanwendung"
//    - "Autorisierte JavaScript-Quellen":
//        https://thomasschlerethbm.github.io
//        http://localhost:5173   (für lokales Testen)
// 5. Die erzeugte Client-ID unten eintragen (sieht aus wie
//    "123456789-abc...apps.googleusercontent.com" - ist ein öffentlicher
//    Bezeichner, kein Geheimnis, darf im Code stehen)
// ------------------------------------------------------------------

export const GOOGLE_CLIENT_ID = '76117333633-paro1ja1cnatq32fokoo6nu1t96dia97.apps.googleusercontent.com';

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

function loadTokenClient(personId, onToken) {
  /* global google */
  return google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (resp && resp.access_token) {
        const record = { token: resp.access_token, expires: Date.now() + (resp.expires_in || 3000) * 1000 };
        localStorage.setItem('gcal_token_' + personId, JSON.stringify(record));
        onToken(resp.access_token);
      }
    },
  });
}

export function connectGoogleCalendar(personId, onToken) {
  if (typeof google === 'undefined' || !google.accounts) {
    alert('Google-Anmeldedienst konnte nicht geladen werden. Bitte Seite neu laden und erneut versuchen.');
    return;
  }
  const client = loadTokenClient(personId, onToken);
  client.requestAccessToken({ prompt: 'consent' });
}

export function refreshGoogleToken(personId, onToken) {
  if (typeof google === 'undefined' || !google.accounts) return;
  const client = loadTokenClient(personId, onToken);
  // "prompt: ''" versucht eine stille Erneuerung ohne Popup, solange die
  // Google-Sitzung im Browser noch aktiv ist und die Berechtigung schon erteilt wurde.
  client.requestAccessToken({ prompt: '' });
}

export function getStoredToken(personId) {
  const raw = localStorage.getItem('gcal_token_' + personId);
  if (!raw) return null;
  try {
    const { token, expires } = JSON.parse(raw);
    if (Date.now() > expires) return null;
    return token;
  } catch {
    return null;
  }
}

export function isConnected(personId) {
  return !!localStorage.getItem('gcal_token_' + personId);
}

export function disconnectGoogleCalendar(personId) {
  localStorage.removeItem('gcal_token_' + personId);
}

export async function fetchGoogleEvents(token, timeMin, timeMax) {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error('EXPIRED');
  if (!res.ok) throw new Error('Google Kalender Fehler: ' + res.status);
  const data = await res.json();
  return data.items || [];
}
