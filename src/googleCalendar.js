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

// Übersetzt Fehler aus dem Google-Anmeldedienst in verständliche Meldungen.
// Der Original-Code wird immer mit angezeigt, damit man ihn bei Rückfragen nennen kann.
function describeAuthError(code, detail) {
  const suffix = code ? ` (Code: ${code}${detail ? ' – ' + detail : ''})` : '';
  switch (code) {
    case 'popup_failed_to_open':
      return 'Das Anmeldefenster wurde vom Browser blockiert. Bitte Pop-ups für diese Seite erlauben und erneut auf „Verbinden“ klicken.' + suffix;
    case 'popup_closed':
    case 'popup_closed_by_user':
      return 'Das Anmeldefenster wurde geschlossen, bevor die Anmeldung abgeschlossen war. Bitte erneut auf „Verbinden“ klicken und das Fenster bis zum Ende offen lassen.' + suffix;
    case 'access_denied':
      return 'Google hat den Zugriff nicht erlaubt. Bitte das Häkchen für „Kalender lesen“ setzen und das richtige Google-Konto wählen.' + suffix;
    case 'immediate_failed':
    case 'interaction_required':
    case 'login_required':
    case 'consent_required':
      return 'Eine stille Erneuerung ist nicht möglich. Bitte einmal neu verbinden.' + suffix;
    case 'unauthorized_client':
    case 'invalid_client':
      return 'Diese Website ist in der Google-Konfiguration nicht als Anwendung freigegeben (Client-ID / Quellen prüfen).' + suffix;
    case 'no_token':
      return 'Google hat kein Zugriffs-Token zurückgegeben. Bitte erneut verbinden.' + suffix;
    default:
      return 'Die Anmeldung bei Google ist fehlgeschlagen.' + suffix;
  }
}

function loadTokenClient(personId, { onToken, onError }) {
  /* global google */
  return google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (resp) => {
      if (!resp) {
        onError && onError(describeAuthError('no_token'));
        return;
      }
      if (resp.error) {
        onError && onError(describeAuthError(resp.error, resp.error_description));
        return;
      }
      if (!resp.access_token) {
        onError && onError(describeAuthError('no_token'));
        return;
      }
      const record = { token: resp.access_token, expires: Date.now() + (resp.expires_in || 3000) * 1000 };
      try {
        localStorage.setItem('gcal_token_' + personId, JSON.stringify(record));
      } catch {
        onError && onError('Der Browser erlaubt das Speichern nicht (Speicher voll oder deaktiviert). Bitte Seite ohne Inkognito-Modus öffnen.');
        return;
      }
      onToken(resp.access_token);
    },
    error_callback: (err) => {
      // GIS-Fehlerobjekt: { type: 'popup_failed_to_open' | 'popup_closed' | 'unknown', message? }
      onError && onError(describeAuthError(err && err.type, err && err.message));
    },
  });
}

// Liefert eine Fehlermeldung (String) oder null, wenn der Anmeldedienst nicht bereit ist.
export function connectGoogleCalendar(personId, { onToken, onError, onStart }) {
  if (typeof google === 'undefined' || !google.accounts) {
    onError && onError('Der Google-Anmeldedienst wurde nicht geladen. Bitte Seite neu laden (ggf. Werbe-/Script-Blocker prüfen).');
    return;
  }
  try {
    const client = loadTokenClient(personId, { onToken, onError });
    onStart && onStart();
    client.requestAccessToken({ prompt: 'consent' });
  } catch (e) {
    onError && onError('Anmeldung konnte nicht gestartet werden: ' + (e && e.message ? e.message : e));
  }
}

export function refreshGoogleToken(personId, { onToken, onError }) {
  if (typeof google === 'undefined' || !google.accounts) {
    onError && onError('Der Google-Anmeldedienst wurde nicht geladen.');
    return;
  }
  try {
    const client = loadTokenClient(personId, { onToken, onError });
    // "prompt: ''" versucht eine stille Erneuerung ohne Popup, solange die
    // Google-Sitzung im Browser noch aktiv ist und die Berechtigung schon erteilt wurde.
    client.requestAccessToken({ prompt: '' });
  } catch (e) {
    onError && onError('Stille Erneuerung nicht möglich: ' + (e && e.message ? e.message : e));
  }
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
