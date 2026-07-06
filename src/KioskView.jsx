import { dkey, fmtLabelDay, completionKey } from './dateUtils';
import { removeItem, setItem } from './db';

const today = new Date();

export default function KioskView({ people, events, tasks, completions }) {
  const key = dkey(today);
  const evs = events
    .filter((e) => e.date === key)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const tks = tasks.filter((t) => (t.freq === 'daily' ? true : t.dueDate === key));

  function isDone(taskId, personId) {
    return completions.some((c) => c.taskId === taskId && c.personId === personId && c.dateKey === key);
  }
  function toggleTask(task, personId) {
    const ckey = completionKey(task.id, personId, key);
    const existing = completions.find((c) => c.id === ckey);
    if (existing) removeItem('completions', ckey);
    else setItem('completions', ckey, { taskId: task.id, personId, dateKey: key, points: task.points });
  }
  function personObj(id) { return people.find((p) => p.id === id); }

  return (
    <div className="kiosk">
      <div className="kiosk-header">
        <div className="kiosk-title">📋 Familientafel</div>
        <div className="kiosk-date">{fmtLabelDay(today)}</div>
      </div>

      <div className="kiosk-grid">
        <div className="kiosk-col">
          <div className="kiosk-section-title">📅 Heute</div>
          {evs.length === 0 && <div className="kiosk-empty">Keine Termine heute.</div>}
          {evs.map((e) => (
            <div className="kiosk-event" style={{ '--dot': e.type === 'special' ? 'var(--coral)' : 'var(--p1)' }} key={e.id}>
              <span className="kiosk-time">{e.time || '–'}</span>
              <span className="kiosk-ev-title">{e.title}</span>
            </div>
          ))}
        </div>

        <div className="kiosk-col">
          <div className="kiosk-section-title">✅ Aufgaben</div>
          {people.map((person) => {
            const mine = tks.filter((t) => t.personIds.includes(person.id));
            if (mine.length === 0) return null;
            return (
              <div className="kiosk-person-block" key={person.id}>
                <div className="kiosk-person-name" style={{ color: person.color }}>{person.name}</div>
                {mine.map((t) => {
                  const done = isDone(t.id, person.id);
                  return (
                    <label key={t.id} className={'kiosk-task' + (done ? ' done' : '')} style={{ '--dot': person.color }}>
                      <input type="checkbox" checked={done} onChange={() => toggleTask(t, person.id)} />
                      <span>{t.title}</span>
                      <span className="kiosk-pts">+{t.points}</span>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
