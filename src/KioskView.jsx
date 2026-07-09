import { useState } from 'react';
import { dkey, fmtLabelDay, completionKey } from './dateUtils';
import { removeItem, setItem } from './db';

const today = new Date();

function getUrlPeopleFilter() {
  const raw = new URLSearchParams(window.location.search).get('people');
  if (!raw) return null;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function KioskView({ people: allPeople, events, tasks, completions, rewards, redemptions, adjustments, kioskPresets }) {
  const [activeFilter, setActiveFilter] = useState(getUrlPeopleFilter()); // null = everyone
  const [screen, setScreen] = useState('agenda'); // 'agenda' | 'points'

  const filterIds = activeFilter;
  const people = filterIds ? allPeople.filter((p) => filterIds.includes(p.id)) : allPeople;
  const key = dkey(today);
  const evs = events
    .filter((e) => e.date === key)
    .filter((e) => !filterIds || !e.personIds || e.personIds.length === 0 || e.personIds.some((id) => filterIds.includes(id)))
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
  function pointsBalance(personId) {
    const earned = completions.filter((c) => c.personId === personId).reduce((s, c) => s + c.points, 0);
    const spent = redemptions.filter((r) => r.personId === personId).reduce((s, r) => s + r.cost, 0);
    const adjusted = adjustments.filter((a) => a.personId === personId).reduce((s, a) => s + a.delta, 0);
    return earned - spent + adjusted;
  }

  return (
    <div className="kiosk">
      <div className="kiosk-header">
        <div>
          <div className="kiosk-title">📋 Family Planner</div>
          <div className="kiosk-date">{fmtLabelDay(today)}</div>
        </div>
        <div className="kiosk-controls">
          <div className="kiosk-preset-row">
            <button className={'kiosk-preset-btn' + (!activeFilter ? ' active' : '')} onClick={() => setActiveFilter(null)}>Alle</button>
            {kioskPresets.map((kp) => (
              <button key={kp.id}
                className={'kiosk-preset-btn' + (activeFilter && [...activeFilter].sort().join(',') === [...kp.personIds].sort().join(',') ? ' active' : '')}
                onClick={() => setActiveFilter(kp.personIds)}>
                {kp.label}
              </button>
            ))}
          </div>
          <div className="kiosk-screen-toggle">
            <button className={screen === 'agenda' ? 'active' : ''} onClick={() => setScreen('agenda')}>📅 Heute</button>
            <button className={screen === 'points' ? 'active' : ''} onClick={() => setScreen('points')}>🏆 Punkte</button>
          </div>
          <button className="kiosk-refresh" onClick={() => window.location.reload()} title="Ansicht aktualisieren">🔄</button>
        </div>
      </div>

      {screen === 'agenda' && (
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
              const mine = tks.filter((t) => (t.personIds || []).includes(person.id));
              if (mine.length === 0) return null;
              return (
                <div className="kiosk-person-block" key={person.id}>
                  <div className="kiosk-person-name" style={{ color: person.color }}>{person.name}</div>
                  {mine.map((t) => {
                    const done = isDone(t.id, person.id);
                    return (
                      <label key={t.id} className={'kiosk-task' + (done ? ' done' : '')} style={{ '--dot': person.color }}>
                        <input type="checkbox" checked={done} onChange={() => toggleTask(t, person.id)} />
                        <span className="kiosk-task-icon">{t.icon || '✅'}</span>
                        <span className="kiosk-task-title">{t.title}</span>
                        <span className="kiosk-pts">+{t.points}</span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'points' && (
        <div className="kiosk-points-grid">
          {people.map((person) => (
            <PointsColumn key={person.id} person={person} points={pointsBalance(person.id)} rewards={rewards} />
          ))}
        </div>
      )}
    </div>
  );
}

function PointsColumn({ person, points, rewards }) {
  const sorted = [...rewards].sort((a, b) => a.cost - b.cost);
  const maxCost = sorted.length ? sorted[sorted.length - 1].cost : 0;
  const ceiling = Math.max(maxCost, points, 10) * 1.08; // small headroom above the top tier
  const fillPct = Math.min(100, (points / ceiling) * 100);
  const nextReward = sorted.find((r) => r.cost > points);

  // Group rewards that share the same cost so their tick marks don't overlap
  const tiers = [];
  sorted.forEach((r) => {
    const last = tiers[tiers.length - 1];
    if (last && last.cost === r.cost) last.names.push(r.name);
    else tiers.push({ cost: r.cost, names: [r.name] });
  });

  return (
    <div className="points-col-wrap">
      <div className="points-col-name" style={{ color: person.color }}>{person.name}</div>
      <div className="points-col-bar-area">
        <div className="points-col-bar-track">
          <div className="points-col-bar-fill" style={{ height: `${fillPct}%`, background: person.color }} />
          {tiers.map((tier) => (
            <div key={tier.cost} className="points-col-tick" style={{ bottom: `${Math.min(100, (tier.cost / ceiling) * 100)}%` }}>
              <span className="points-col-tick-line" />
              <span className="points-col-tick-label">{tier.names.join(' / ')} · {tier.cost}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="points-col-total mono">{points} Pkt.</div>
      <div className="points-col-next">
        {nextReward
          ? <>noch <strong>{nextReward.cost - points}</strong> bis "{nextReward.name}"</>
          : sorted.length ? '🎉 Alle Prämien erreicht!' : 'Noch keine Prämien angelegt'}
      </div>
    </div>
  );
}
