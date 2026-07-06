import { useState, useEffect, useCallback } from 'react';
import { setItem, removeItem } from './db';
import {
  connectGoogleCalendar, refreshGoogleToken, getStoredToken,
  isConnected, disconnectGoogleCalendar, fetchGoogleEvents,
} from './googleCalendar';

const SYNC_WINDOW_PAST_DAYS = 7;
const SYNC_WINDOW_FUTURE_DAYS = 120;

function toLocalDateParts(gEvent, field) {
  // Google gives either {date: 'YYYY-MM-DD'} for all-day events
  // or {dateTime: 'YYYY-MM-DDTHH:MM:SS+TZ'} for timed events.
  const node = gEvent[field];
  if (!node) return { date: '', time: '' };
  if (node.date) return { date: node.date, time: '' };
  if (node.dateTime) {
    const d = new Date(node.dateTime);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }
  return { date: '', time: '' };
}

export default function GoogleCalendarPanel({ people, events }) {
  const [connected, setConnected] = useState({});
  const [syncing, setSyncing] = useState({});
  const [lastSync, setLastSync] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const initial = {};
    people.forEach((p) => { initial[p.id] = isConnected(p.id); });
    setConnected(initial);
  }, [people]);

  const syncPerson = useCallback(async (personId) => {
    let token = getStoredToken(personId);
    setSyncing((s) => ({ ...s, [personId]: true }));
    setErrors((e) => ({ ...e, [personId]: null }));
    try {
      if (!token) {
        // try a silent refresh (no popup) before giving up
        await new Promise((resolve) => {
          refreshGoogleToken(personId, (t) => { token = t; resolve(); });
          setTimeout(resolve, 3000);
        });
      }
      if (!token) throw new Error('EXPIRED');

      const timeMin = new Date(Date.now() - SYNC_WINDOW_PAST_DAYS * 86400000).toISOString();
      const timeMax = new Date(Date.now() + SYNC_WINDOW_FUTURE_DAYS * 86400000).toISOString();
      const items = await fetchGoogleEvents(token, timeMin, timeMax);

      const freshIds = new Set();
      for (const it of items) {
        const { date, time } = toLocalDateParts(it, 'start');
        if (!date) continue;
        const id = `google_${personId}_${it.id}`;
        freshIds.add(id);
        await setItem('events', id, {
          title: it.summary || '(ohne Titel)',
          date, time,
          personIds: [personId],
          type: 'special',
          source: 'google',
          googleOwner: personId,
        });
      }
      // remove events previously imported for this person that are gone now
      const stale = events.filter((e) => e.googleOwner === personId && !freshIds.has(e.id));
      for (const s of stale) await removeItem('events', s.id);

      setLastSync((s) => ({ ...s, [personId]: Date.now() }));
    } catch (err) {
      if (err.message === 'EXPIRED') {
        setErrors((e) => ({ ...e, [personId]: 'Anmeldung abgelaufen – bitte neu verbinden.' }));
        setConnected((c) => ({ ...c, [personId]: false }));
      } else {
        setErrors((e) => ({ ...e, [personId]: 'Sync fehlgeschlagen.' }));
      }
    } finally {
      setSyncing((s) => ({ ...s, [personId]: false }));
    }
  }, [events]);

  // auto-sync once on load for anyone already connected, then every 15 min
  useEffect(() => {
    people.forEach((p) => { if (isConnected(p.id)) syncPerson(p.id); });
    const interval = setInterval(() => {
      people.forEach((p) => { if (isConnected(p.id)) syncPerson(p.id); });
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people.length]);

  function handleConnect(personId) {
    connectGoogleCalendar(personId, () => {
      setConnected((c) => ({ ...c, [personId]: true }));
      syncPerson(personId);
    });
  }

  function handleDisconnect(personId) {
    disconnectGoogleCalendar(personId);
    setConnected((c) => ({ ...c, [personId]: false }));
  }

  return (
    <div className="card">
      <h3>🔗 Google-Kalender</h3>
      <div className="help-text" style={{ marginBottom: 10 }}>
        Jede Person verbindet ihr eigenes Google-Konto. Termine werden alle 15
        Minuten automatisch abgeglichen und für die ganze Familie sichtbar.
      </div>
      {people.map((p) => (
        <div className="gcal-row" key={p.id}>
          <span className="avatar" style={{ background: p.color }}>{p.name[0]}</span>
          <span className="gcal-name">{p.name}</span>
          {connected[p.id] ? (
            <>
              <button className="btn-ghost small" disabled={syncing[p.id]} onClick={() => syncPerson(p.id)}>
                {syncing[p.id] ? '…' : '🔄'}
              </button>
              <button className="btn-ghost small" onClick={() => handleDisconnect(p.id)}>Trennen</button>
            </>
          ) : (
            <button className="btn-ghost small" onClick={() => handleConnect(p.id)}>Verbinden</button>
          )}
        </div>
      ))}
      {Object.entries(errors).filter(([, v]) => v).map(([pid, msg]) => (
        <div key={pid} className="gcal-error">{people.find((p) => p.id === pid)?.name}: {msg}</div>
      ))}
    </div>
  );
}
