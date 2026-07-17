import { useState } from 'react';
import { dkey, fmtLabelDay, completionKey } from './dateUtils';
import { removeItem, setItem, pushItem } from './db';
import { groupByTimeOfDay } from './timeOfDay';
import { taskOccursOn, eventOccursOn } from './occurrence';

const today = new Date();
const BAR_HEIGHT_PX = 340;
const MIN_LABEL_GAP_PX = 36;

function getUrlPeopleFilter() {
  const raw = new URLSearchParams(window.location.search).get('people');
  if (!raw) return null;
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function KioskView({ people: allPeople, events, tasks, completions, rewards, redemptions, adjustments, kioskPresets }) {
  const [activeFilter, setActiveFilter] = useState(getUrlPeopleFilter()); // null = everyone
  const [screen, setScreen] = useState('agenda'); // 'agenda' | 'points'
  const [redeemPerson, setRedeemPerson] = useState(null);

  const filterIds = activeFilter;
  const people = filterIds ? allPeople.filter((p) => filterIds.includes(p.id)) : allPeople;
  const key = dkey(today);
  const evs = events
    .filter((e) => eventOccursOn(e, today))
    .filter((e) => !filterIds || !e.personIds || e.personIds.length === 0 || e.personIds.some((id) => filterIds.includes(id)))
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const tks = tasks.filter((t) => taskOccursOn(t, today));

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
  function redeem(reward, personId) {
    pushItem('redemptions', { personId, cost: reward.cost, name: reward.name, ts: Date.now() });
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
              const groups = groupByTimeOfDay(mine, (t) => t.timeOfDay);
              return (
                <div className="kiosk-person-block" key={person.id}>
                  <div className="kiosk-person-name" style={{ color: person.color }}>{person.name}</div>
                  {groups.map((g) => (
                    <div key={g.key} className="kiosk-tod-group">
                      <div className="kiosk-tod-label">{g.label}</div>
                      {g.items.map((t) => {
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
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'points' && (
        <div className="kiosk-points-grid">
          {people.map((person) => (
            <PointsColumn key={person.id} person={person} points={pointsBalance(person.id)} rewards={rewards}
              onOpenRedeem={() => setRedeemPerson(person)} />
          ))}
        </div>
      )}

      {redeemPerson && (
        <RedeemModal
          person={redeemPerson}
          points={pointsBalance(redeemPerson.id)}
          rewards={rewards}
          onRedeem={(reward) => redeem(reward, redeemPerson.id)}
          onClose={() => setRedeemPerson(null)}
        />
      )}
    </div>
  );
}

function PointsColumn({ person, points, rewards, onOpenRedeem }) {
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

  // Convert to raw pixel positions (from the bottom of the bar), then push
  // apart any ticks that would otherwise sit closer than MIN_LABEL_GAP_PX -
  // this is what actually prevents the label text from overlapping.
  let lastPx = -Infinity;
  const positioned = tiers.map((tier) => {
    const rawPx = Math.min(BAR_HEIGHT_PX, (tier.cost / ceiling) * BAR_HEIGHT_PX);
    const px = Math.max(rawPx, lastPx + MIN_LABEL_GAP_PX);
    lastPx = px;
    return { ...tier, px };
  });

  return (
    <div className="points-col-wrap">
      <div className="points-col-name" style={{ color: person.color }}>{person.name}</div>
      <button type="button" className="points-col-bar-area" onClick={onOpenRedeem} title="Antippen zum Einlösen">
        <div className="points-col-bar-track">
          <div className="points-col-bar-fill" style={{ height: `${fillPct}%`, background: person.color }} />
          {positioned.map((tier) => (
            <div key={tier.cost} className="points-col-tick" style={{ bottom: `${tier.px}px` }}>
              <span className="points-col-tick-line" />
              <span className="points-col-tick-label">{tier.names.join(' / ')} · {tier.cost}</span>
            </div>
          ))}
        </div>
      </button>
      <div className="points-col-total mono">{points} Pkt.</div>
      <div className="points-col-next">
        {nextReward
          ? <>noch <strong>{nextReward.cost - points}</strong> bis "{nextReward.name}"</>
          : sorted.length ? '🎉 Alle Prämien erreicht!' : 'Noch keine Prämien angelegt'}
      </div>
      <button type="button" className="points-col-redeem-btn" onClick={onOpenRedeem}>🎁 Einlösen</button>
    </div>
  );
}

function RedeemModal({ person, points, rewards, onRedeem, onClose }) {
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'error'|'success', text }
  const sorted = [...rewards].sort((a, b) => a.cost - b.cost);
  const selected = sorted.find((r) => r.id === selectedId);

  function confirm() {
    if (!selected) return;
    if (points < selected.cost) {
      setMessage({ type: 'error', text: `Dir fehlen noch ${selected.cost - points} Punkte für "${selected.name}".` });
      return;
    }
    onRedeem(selected);
    setMessage({ type: 'success', text: `"${selected.name}" eingelöst! 🎉` });
    setTimeout(onClose, 1400);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal kiosk-redeem-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>Prämie einlösen — {person.name}</h3>
        <div className="help-text" style={{ marginBottom: 12 }}>Aktueller Punktestand: <strong>{points} Pkt.</strong></div>
        {sorted.length === 0 && <div className="empty-note">Noch keine Prämien angelegt.</div>}
        <div className="kiosk-redeem-list">
          {sorted.map((r) => {
            const affordable = points >= r.cost;
            return (
              <label key={r.id} className={'kiosk-redeem-row' + (selectedId === r.id ? ' selected' : '') + (!affordable ? ' unaffordable' : '')}>
                <input type="radio" name="reward" checked={selectedId === r.id} onChange={() => { setSelectedId(r.id); setMessage(null); }} />
                <span className="kiosk-redeem-name">{r.name}</span>
                <span className="kiosk-redeem-cost mono">{r.cost} Pkt.</span>
              </label>
            );
          })}
        </div>
        {message && <div className={'kiosk-redeem-message ' + message.type}>{message.text}</div>}
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={!selected} onClick={confirm}>OK</button>
        </div>
      </div>
    </div>
  );
}
