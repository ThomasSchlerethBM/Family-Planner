import { useState, useEffect, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { listenList, pushItem, setItem, updateItem, removeItem, seedIfEmpty } from './db';
import { SEED_MEMBERS, SEED_EVENTS, SEED_TASKS, SEED_REWARDS } from './seedData';
import {
  DOW, MONTHS, dkey, sameDay, addDays, startOfWeek, startOfMonth,
  fmtLabelDay, fmtLabelWeek, fmtLabelMonth, completionKey,
} from './dateUtils';
import KioskView from './KioskView.jsx';
import MembersManager from './MembersManager.jsx';
import GoogleCalendarPanel from './GoogleCalendarPanel.jsx';

// Ändere diese PIN! Sie schaltet den Bearbeiten-Modus frei
// (Termine/Aufgaben/Prämien anlegen, löschen). Zum Abhaken und
// Einlösen braucht niemand die PIN.
const ADMIN_PIN = '1234';

const today = new Date();
const isKioskUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('kiosk') === '1';

export default function App() {
  const [people, setPeople] = useState([]);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);

  const [mode, setMode] = useState('both');
  const [period, setPeriod] = useState('week');
  const [current, setCurrent] = useState(new Date());
  const [selectedPersons, setSelectedPersons] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // ---- first run: seed database if empty, then subscribe ----
  useEffect(() => {
    (async () => {
      await seedIfEmpty('members', SEED_MEMBERS);
      await seedIfEmpty('events', SEED_EVENTS);
      await seedIfEmpty('tasks', SEED_TASKS);
      await seedIfEmpty('rewards', SEED_REWARDS);
      setLoading(false);
    })();

    const un1 = listenList('members', (list) => {
      setPeople(list);
      setSelectedPersons((prev) => (prev.length ? prev : list.map((p) => p.id)));
    });
    const un2 = listenList('events', setEvents);
    const un3 = listenList('tasks', setTasks);
    const un4 = listenList('rewards', setRewards);
    const un5 = listenList('completions', setCompletions);
    const un6 = listenList('redemptions', setRedemptions);
    return () => { un1(); un2(); un3(); un4(); un5(); un6(); };
  }, []);

  function togglePerson(id) {
    setSelectedPersons((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function personColor(id) { const p = people.find((p) => p.id === id); return p ? p.color : 'var(--chalk-faint)'; }
  function personObj(id) { return people.find((p) => p.id === id); }

  function visibleForEvent(ev) {
    if (!ev.personIds || ev.personIds.length === 0) return true;
    return ev.personIds.some((id) => selectedPersons.includes(id));
  }
  function visibleForTask(t) { return t.personIds.some((id) => selectedPersons.includes(id)); }

  const visibleEvents = useMemo(() => events.filter(visibleForEvent), [events, selectedPersons]);
  const visibleTasks = useMemo(() => tasks.filter(visibleForTask), [tasks, selectedPersons]);

  function eventsOn(key) { return visibleEvents.filter((e) => e.date === key); }
  function tasksOn(dateObj) {
    const key = dkey(dateObj);
    return visibleTasks.filter((t) => (t.freq === 'daily' ? true : t.dueDate === key));
  }
  function isDone(taskId, personId, key) {
    return completions.some((c) => c.taskId === taskId && c.personId === personId && c.dateKey === key);
  }
  function toggleTask(task, personId, dateObj) {
    const key = dkey(dateObj);
    const ckey = completionKey(task.id, personId, key);
    const existing = completions.find((c) => c.id === ckey);
    if (existing) removeItem('completions', ckey);
    else setItem('completions', ckey, { taskId: task.id, personId, dateKey: key, points: task.points });
  }

  function pointsBalance(personId) {
    const earned = completions.filter((c) => c.personId === personId).reduce((s, c) => s + c.points, 0);
    const spent = redemptions.filter((r) => r.personId === personId).reduce((s, r) => s + r.cost, 0);
    return earned - spent;
  }
  function redeem(reward, personId) {
    if (pointsBalance(personId) < reward.cost) return;
    pushItem('redemptions', { personId, cost: reward.cost, name: reward.name, ts: Date.now() });
  }

  function step(delta) {
    if (period === 'day') setCurrent((c) => addDays(c, delta));
    else if (period === 'week') setCurrent((c) => addDays(c, delta * 7));
    else if (period === 'month') setCurrent((c) => { const n = new Date(c); n.setMonth(n.getMonth() + delta); return n; });
    else setCurrent((c) => { const n = new Date(c); n.setFullYear(n.getFullYear() + delta); return n; });
  }
  function periodLabel() {
    if (period === 'day') return fmtLabelDay(current);
    if (period === 'week') return fmtLabelWeek(current);
    if (period === 'month') return fmtLabelMonth(current);
    return '' + current.getFullYear();
  }

  function parseICS(text) {
    const blocks = text.split('BEGIN:VEVENT').slice(1);
    const imported = [];
    blocks.forEach((b) => {
      const body = b.split('END:VEVENT')[0];
      const summaryMatch = body.match(/SUMMARY:(.*)/);
      const dtMatch = body.match(/DTSTART[^:]*:(\d{8})(T(\d{6}))?/);
      if (dtMatch) {
        const raw = dtMatch[1];
        const y = raw.slice(0, 4), m = raw.slice(4, 6), day = raw.slice(6, 8);
        const time = dtMatch[3] ? dtMatch[3].slice(0, 2) + ':' + dtMatch[3].slice(2, 4) : '';
        imported.push({
          title: summaryMatch ? summaryMatch[1].trim() : 'Importierter Termin',
          date: `${y}-${m}-${day}`, time, personIds: [], type: 'special', source: 'google',
        });
      }
    });
    return imported;
  }
  const [icsText, setIcsText] = useState('');
  function doImport() {
    parseICS(icsText).forEach((ev) => pushItem('events', ev));
    setIcsText('');
    setShowImport(false);
  }

  function tryUnlockAdmin(pin) {
    if (pin === ADMIN_PIN) { setIsAdmin(true); setShowPinModal(false); }
    else alert('Falsche PIN.');
  }

  if (loading) return <div className="loading-screen">Lade Familientafel…</div>;
  if (isKioskUrl) return <KioskView people={people} events={events} tasks={tasks} completions={completions} />;

  function PersonDots({ ids }) {
    return <span style={{ display: 'flex', gap: 3 }}>
      {ids.map((id) => <span key={id} className="mc-dot" style={{ background: personColor(id) }}></span>)}
    </span>;
  }

  function DayView() {
    const key = dkey(current);
    const evs = eventsOn(key).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    const tks = tasksOn(current);
    return (
      <div className="day-col">
        {(mode === 'calendar' || mode === 'both') && <div>
          <div className="day-section-title">📅 Termine</div>
          {evs.length === 0 && <div className="empty-note">Keine Termine an diesem Tag.</div>}
          {evs.map((e) => (
            <div className="event-row" style={{ '--dot': e.type === 'special' ? 'var(--coral)' : 'var(--p1)' }} key={e.id}>
              <span className="time">{e.time || '–'}</span>
              <span className="name">{e.title}</span>
              <PersonDots ids={e.personIds} />
              <span className={'tag ' + (e.type === 'special' ? 'tag-special' : 'tag-recurring')}>{e.type === 'special' ? 'Sonder' : 'Fest'}</span>
              {e.source === 'google' && <span className="tag" title="Aus Google importiert">G</span>}
              {isAdmin && <button className="row-del" onClick={() => removeItem('events', e.id)}>✕</button>}
            </div>
          ))}
        </div>}
        {(mode === 'chores' || mode === 'both') && <div style={{ marginTop: 10 }}>
          <div className="day-section-title">✅ Aufgaben</div>
          {tks.length === 0 && <div className="empty-note">Keine Aufgaben an diesem Tag.</div>}
          {tks.map((t) => t.personIds.filter((pid) => selectedPersons.includes(pid)).map((pid) => {
            const done = isDone(t.id, pid, key);
            const person = personObj(pid);
            if (!person) return null;
            return (
              <div className={'task-row' + (done ? ' done' : '')} style={{ '--dot': person.color }} key={t.id + pid}>
                <input type="checkbox" checked={done} onChange={() => toggleTask(t, pid, current)} />
                <span className="name">{t.title} <span style={{ color: 'var(--chalk-faint)', fontWeight: 400 }}>· {person.name}</span></span>
                <span className="pts">+{t.points}</span>
                {isAdmin && <button className="row-del" onClick={() => removeItem('tasks', t.id)}>✕</button>}
              </div>
            );
          }))}
        </div>}
      </div>
    );
  }

  function WeekView() {
    const start = startOfWeek(current);
    const days = [...Array(7)].map((_, i) => addDays(start, i));
    return (
      <div className="week-grid">
        {days.map((dt) => {
          const key = dkey(dt);
          const evs = eventsOn(key);
          const tks = tasksOn(dt);
          return (
            <div className={'week-day' + (sameDay(dt, today) ? ' today' : '')} key={key}>
              <div className="wd-head">
                <span className="wd-name">{DOW[(dt.getDay() + 6) % 7]}</span>
                <span className="wd-num">{dt.getDate()}.{dt.getMonth() + 1}.</span>
              </div>
              {(mode === 'calendar' || mode === 'both') && evs.map((e) => (
                <div className="mini-item" style={{ '--dot': e.type === 'special' ? 'var(--coral)' : 'var(--p1)' }} key={e.id}>
                  {e.time && <span className="mono">{e.time}</span>} {e.title}
                </div>
              ))}
              {(mode === 'chores' || mode === 'both') && tks.flatMap((t) => t.personIds.filter((pid) => selectedPersons.includes(pid)).map((pid) => {
                const done = isDone(t.id, pid, key);
                const person = personObj(pid);
                if (!person) return null;
                return (
                  <label className={'mini-item' + (done ? ' done' : '')} style={{ '--dot': person.color }} key={t.id + pid}>
                    <input type="checkbox" checked={done} onChange={() => toggleTask(t, pid, dt)} />
                    <span>{t.title} <span className="mini-item-person">· {person.name}</span></span>
                  </label>
                );
              }))}
            </div>
          );
        })}
      </div>
    );
  }

  function MonthView() {
    const first = startOfMonth(current);
    const startGrid = startOfWeek(first);
    const cells = [...Array(42)].map((_, i) => addDays(startGrid, i));
    return (
      <div>
        <div className="month-grid" style={{ marginBottom: 6 }}>
          {DOW.map((dn) => <div className="month-dow" key={dn}>{dn}</div>)}
        </div>
        <div className="month-grid">
          {cells.map((dt) => {
            const key = dkey(dt);
            const inMonth = dt.getMonth() === current.getMonth();
            const evs = eventsOn(key);
            const tks = tasksOn(dt).flatMap((t) => t.personIds.filter((pid) => selectedPersons.includes(pid)));
            const showEv = mode === 'calendar' || mode === 'both';
            const showCh = mode === 'chores' || mode === 'both';
            return (
              <div key={key}
                className={'month-cell' + (inMonth ? '' : ' faded') + (sameDay(dt, today) ? ' today' : '') + (selectedDay && sameDay(dt, selectedDay) ? ' selected' : '')}
                onClick={() => setSelectedDay(dt)}>
                <span className="mc-num">{dt.getDate()}</span>
                <div className="mc-dots">
                  {showEv && evs.slice(0, 4).map((e) => <span key={e.id} className="mc-dot" style={{ background: e.type === 'special' ? 'var(--coral)' : 'var(--p1)' }}></span>)}
                  {showCh && tks.slice(0, 4).map((pid, i) => <span key={i} className="mc-dot" style={{ background: personColor(pid) }}></span>)}
                </div>
                {(evs.length + tks.length) > 0 && <span className="mc-count">{evs.length ? evs.length + ' Termin(e)' : ''}{evs.length && tks.length ? ' · ' : ''}{tks.length ? tks.length + ' Aufgabe(n)' : ''}</span>}
              </div>
            );
          })}
        </div>
        {selectedDay && <DayDetailPanel dt={selectedDay} />}
      </div>
    );
  }

  function DayDetailPanel({ dt }) {
    const key = dkey(dt);
    const evs = eventsOn(key);
    const tks = tasksOn(dt);
    return (
      <div className="card" style={{ marginTop: 14 }}>
        <h3>{fmtLabelDay(dt)}</h3>
        <div className="day-detail-list">
          {(mode === 'calendar' || mode === 'both') && evs.map((e) => (
            <div className="event-row" style={{ '--dot': e.type === 'special' ? 'var(--coral)' : 'var(--p1)' }} key={e.id}>
              <span className="time">{e.time || '–'}</span><span className="name">{e.title}</span>
            </div>
          ))}
          {(mode === 'chores' || mode === 'both') && tks.flatMap((t) => t.personIds.filter((pid) => selectedPersons.includes(pid)).map((pid) => {
            const done = isDone(t.id, pid, key);
            const person = personObj(pid);
            if (!person) return null;
            return (
              <div className={'task-row' + (done ? ' done' : '')} style={{ '--dot': person.color }} key={t.id + pid}>
                <input type="checkbox" checked={done} onChange={() => toggleTask(t, pid, dt)} />
                <span className="name">{t.title} · {person.name}</span><span className="pts">+{t.points}</span>
              </div>
            );
          }))}
          {evs.length === 0 && tks.length === 0 && <div className="empty-note">Nichts los an diesem Tag.</div>}
        </div>
      </div>
    );
  }

  function YearView() {
    const year = current.getFullYear();
    return (
      <div className="year-grid">
        {MONTHS.map((mn, mi) => {
          const first = new Date(year, mi, 1);
          const startGrid = startOfWeek(first);
          const cells = [...Array(35)].map((_, i) => addDays(startGrid, i));
          return (
            <div className="year-month" key={mn} onClick={() => { setCurrent(new Date(year, mi, 1)); setPeriod('month'); }}>
              <h4>{mn}</h4>
              <div className="year-mini-grid">
                {cells.map((dt) => {
                  const key = dkey(dt);
                  const inMonth = dt.getMonth() === mi;
                  const has = inMonth && (eventsOn(key).length > 0 || tasksOn(dt).length > 0);
                  return <div key={key} className={'year-mini-cell' + (has ? ' has-item' : '') + (sameDay(dt, today) ? ' today' : '')}
                    style={{ opacity: inMonth ? 1 : 0.15 }}></div>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div className="title-wrap">
          <h1>📋 Familientafel</h1>
          <div className="sub">Kalender &amp; Aufgaben an einem Ort · live synchronisiert</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin ? (
            <>
              <button className="icon-btn" onClick={() => setShowEventModal(true)}>+ Termin</button>
              <button className="icon-btn" onClick={() => setShowTaskModal(true)}>+ Aufgabe</button>
              <button className="icon-btn" onClick={() => setShowImport(true)}>⇩ Google-Import</button>
              <button className="icon-btn" onClick={() => setShowKioskModal(true)}>🖥️ Kiosk-Modus</button>
              <button className="icon-btn" onClick={() => setIsAdmin(false)}>Admin: An 🔓</button>
            </>
          ) : (
            <button className="icon-btn" onClick={() => setShowPinModal(true)}>Admin 🔒</button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="segmented">
            <button className={mode === 'calendar' ? 'active' : ''} onClick={() => setMode('calendar')}>Nur Kalender</button>
            <button className={mode === 'chores' ? 'active' : ''} onClick={() => setMode('chores')}>Nur Aufgaben</button>
            <button className={mode === 'both' ? 'active' : ''} onClick={() => setMode('both')}>Beides</button>
          </div>
          <div className="segmented">
            <button className={period === 'day' ? 'active' : ''} onClick={() => setPeriod('day')}>Tag</button>
            <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Woche</button>
            <button className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Monat</button>
            <button className={period === 'year' ? 'active' : ''} onClick={() => setPeriod('year')}>Jahr</button>
          </div>
        </div>
        <div className="datewalk">
          <button onClick={() => step(-1)}>‹</button>
          <span className="label">{periodLabel()}</span>
          <button onClick={() => step(1)}>›</button>
          <button className="icon-btn" style={{ marginLeft: 6 }} onClick={() => { setCurrent(new Date()); setSelectedDay(null); }}>Heute</button>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {people.map((p) => (
          <div key={p.id} className={'chip' + (selectedPersons.includes(p.id) ? ' active' : '')}
            style={{ '--dot': p.color }} onClick={() => togglePerson(p.id)}>
            <span className="dot"></span>{p.name}
          </div>
        ))}
      </div>

      <div className="layout">
        <div className="board-panel">
          {period === 'day' && <DayView />}
          {period === 'week' && <WeekView />}
          {period === 'month' && <MonthView />}
          {period === 'year' && <YearView />}
        </div>

        <div className="sidebar">
          {isAdmin && <MembersManager people={people} />}

          <GoogleCalendarPanel people={people} events={events} />

          <div className="card">
            <h3>🪙 Punktestand</h3>
            {people.map((p) => (
              <div className="person-score" key={p.id}>
                <div className="avatar" style={{ background: p.color }}>{p.name[0]}</div>
                <div className="pname">{p.name}</div>
                <div className="pscore mono">{pointsBalance(p.id)}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>🎁 Prämien</h3>
            <RewardRedeemer people={people} rewards={rewards} pointsBalance={pointsBalance} redeem={redeem} isAdmin={isAdmin} />
          </div>

          <div className="card">
            <h3>ℹ️ Live-Sync</h3>
            <div className="help-text">
              Alle Änderungen werden in Echtzeit über Firebase gespeichert und auf allen Geräten
              der Familie synchronisiert – genau wie bei der Tennis-App.
            </div>
          </div>
        </div>
      </div>

      {showEventModal && <EventModal people={people}
        onClose={() => setShowEventModal(false)}
        onSave={(ev) => { pushItem('events', ev); setShowEventModal(false); }} />}
      {showTaskModal && <TaskModal people={people}
        onClose={() => setShowTaskModal(false)}
        onSave={(t) => { pushItem('tasks', t); setShowTaskModal(false); }} />}
      {showImport && <ImportModal icsText={icsText} setIcsText={setIcsText} onClose={() => setShowImport(false)} onImport={doImport} />}
      {showPinModal && <PinModal onClose={() => setShowPinModal(false)} onSubmit={tryUnlockAdmin} />}
      {showKioskModal && <KioskQrModal onClose={() => setShowKioskModal(false)} />}
    </div>
  );
}

function KioskQrModal({ onClose }) {
  const kioskUrl = `${window.location.origin}${window.location.pathname}?kiosk=1`;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>Kiosk-Modus</h3>
        <div className="help-text" style={{ marginBottom: 12 }}>
          Scanne den QR-Code mit einem Tablet oder Handy in der Küche, um die
          vereinfachte Vollbild-Ansicht (nur heutige Termine &amp; Aufgaben, große Schrift,
          kein Admin-Zugang) direkt zu öffnen.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--chalk)', padding: 16, borderRadius: 12 }}>
          <QRCodeCanvas value={kioskUrl} size={200} />
        </div>
        <div className="help-text" style={{ marginTop: 12, wordBreak: 'break-all' }}>{kioskUrl}</div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Schließen</button>
          <button className="btn-primary" onClick={() => window.open(kioskUrl, '_blank')}>In neuem Tab öffnen</button>
        </div>
      </div>
    </div>
  );
}

function PinModal({ onClose, onSubmit }) {
  const [pin, setPin] = useState('');
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>Admin-PIN</h3>
        <div className="field">
          <input type="text" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)}
            placeholder="PIN eingeben" onKeyDown={(e) => e.key === 'Enter' && onSubmit(pin)} />
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" onClick={() => onSubmit(pin)}>Freischalten</button>
        </div>
      </div>
    </div>
  );
}

function RewardRedeemer({ people, rewards, pointsBalance, redeem, isAdmin }) {
  const [personId, setPersonId] = useState('');
  useEffect(() => { if (!personId && people.length) setPersonId(people[0].id); }, [people]);
  if (!people.length) return <div className="empty-note">Noch keine Familienmitglieder.</div>;
  return (
    <div>
      <div className="field">
        <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name} ({pointsBalance(p.id)} Pkt.)</option>)}
        </select>
      </div>
      {rewards.map((r) => (
        <div className="reward" key={r.id}>
          <div className="rname">{r.name}</div>
          <div className="rcost mono">{r.cost}</div>
          <button disabled={pointsBalance(personId) < r.cost} onClick={() => redeem(r, personId)}>Einlösen</button>
          {isAdmin && <button className="row-del" onClick={() => removeItem('rewards', r.id)}>✕</button>}
        </div>
      ))}
    </div>
  );
}

function EventModal({ people, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(dkey(new Date()));
  const [time, setTime] = useState('');
  const [type, setType] = useState('special');
  const [personIds, setPersonIds] = useState([]);
  function toggle(id) { setPersonIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>Neuer Termin</h3>
        <div className="field"><label>Titel</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Zahnarzt" /></div>
        <div className="field row">
          <div><label>Datum</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label>Uhrzeit (optional)</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <div className="field">
          <label>Art</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="special">Sondertermin (hervorgehoben)</option>
            <option value="recurring">Standardtermin</option>
          </select>
        </div>
        <div className="field">
          <label>Betrifft wen?</label>
          <div className="person-pick">
            {people.map((p) => (
              <div key={p.id} className={'chip' + (personIds.includes(p.id) ? ' active' : '')} style={{ '--dot': p.color }} onClick={() => toggle(p.id)}>
                <span className="dot"></span>{p.name}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={!title} onClick={() => onSave({ title, date, time, type, personIds, source: 'local' })}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ people, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(10);
  const [freq, setFreq] = useState('daily');
  const [dueDate, setDueDate] = useState(dkey(new Date()));
  const [personIds, setPersonIds] = useState([]);
  function toggle(id) { setPersonIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>Neue Aufgabe</h3>
        <div className="field"><label>Titel</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Zimmer aufräumen" /></div>
        <div className="field row">
          <div><label>Punkte</label><input type="number" value={points} onChange={(e) => setPoints(parseInt(e.target.value || 0))} /></div>
          <div>
            <label>Häufigkeit</label>
            <select value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="daily">Tägliche Routine</option>
              <option value="once">Einmalig</option>
            </select>
          </div>
        </div>
        {freq === 'once' && <div className="field"><label>Fällig am</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>}
        <div className="field">
          <label>Zuständig</label>
          <div className="person-pick">
            {people.map((p) => (
              <div key={p.id} className={'chip' + (personIds.includes(p.id) ? ' active' : '')} style={{ '--dot': p.color }} onClick={() => toggle(p.id)}>
                <span className="dot"></span>{p.name}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={!title || personIds.length === 0}
            onClick={() => onSave({ title, points, freq, dueDate: freq === 'once' ? dueDate : null, personIds })}>Speichern</button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ icsText, setIcsText, onClose, onImport }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>Google-Kalender Import</h3>
        <div className="help-text" style={{ marginBottom: 10 }}>
          In Google Kalender: Einstellungen → Kalender exportieren (.ics) → Datei mit Texteditor öffnen → Inhalt hier einfügen.
        </div>
        <div className="field">
          <label>ICS-Inhalt einfügen</label>
          <textarea value={icsText} onChange={(e) => setIcsText(e.target.value)} placeholder="BEGIN:VCALENDAR..."></textarea>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={!icsText.trim()} onClick={onImport}>Importieren</button>
        </div>
      </div>
    </div>
  );
}
