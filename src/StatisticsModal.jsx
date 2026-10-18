import { useState, useMemo } from 'react';
import { dkey, addDays, startOfWeek, MONTHS, DOW } from './dateUtils';
import { ACTION_TYPES, CATEGORY_LABELS } from './activityLog';

const BUCKET_COUNT = { day: 14, week: 10, month: 12, year: 5 };
const GRANULARITY_LABELS = { day: 'Tag', week: 'Woche', month: 'Monat', year: 'Jahr' };

function buildBuckets(granularity) {
  const today = new Date();
  const count = BUCKET_COUNT[granularity];
  const buckets = [];
  if (granularity === 'day') {
    for (let i = count - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      buckets.push({ label: `${d.getDate()}.${d.getMonth() + 1}.`, start: dkey(d), end: dkey(d) });
    }
  } else if (granularity === 'week') {
    const thisWeekStart = startOfWeek(today);
    for (let i = count - 1; i >= 0; i--) {
      const start = addDays(thisWeekStart, -7 * i);
      const end = addDays(start, 6);
      buckets.push({
        label: `${start.getDate()}.${start.getMonth() + 1}.–${end.getDate()}.${end.getMonth() + 1}.`,
        start: dkey(start), end: dkey(end),
      });
    }
  } else if (granularity === 'month') {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      buckets.push({ label: `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`, start: dkey(d), end: dkey(end) });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const y = today.getFullYear() - i;
      buckets.push({ label: `${y}`, start: `${y}-01-01`, end: `${y}-12-31` });
    }
  }
  return buckets;
}

function Overview({ people, tasks, completions, adjustments }) {
  const [granularity, setGranularity] = useState('week');
  const [selectedBucketIdx, setSelectedBucketIdx] = useState(null);

  const buckets = useMemo(() => buildBuckets(granularity), [granularity]);

  // points earned per bucket per person = completed tasks' points + manual adjustments (signed)
  const data = useMemo(() => {
    return buckets.map((b) => {
      const perPerson = {};
      people.forEach((p) => {
        const fromCompletions = completions
          .filter((c) => c.personId === p.id && c.dateKey >= b.start && c.dateKey <= b.end)
          .reduce((s, c) => s + c.points, 0);
        const fromAdjustments = adjustments
          .filter((a) => a.personId === p.id && dkey(new Date(a.ts)) >= b.start && dkey(new Date(a.ts)) <= b.end)
          .reduce((s, a) => s + a.delta, 0);
        perPerson[p.id] = fromCompletions + fromAdjustments;
      });
      return { ...b, perPerson, total: Object.values(perPerson).reduce((s, v) => s + v, 0) };
    });
  }, [buckets, people, completions, adjustments]);

  const maxValue = Math.max(1, ...data.flatMap((b) => people.map((p) => b.perPerson[p.id])));

  const selectedBucket = selectedBucketIdx != null ? data[selectedBucketIdx] : null;
  const detailItems = useMemo(() => {
    if (!selectedBucket) return [];
    const fromCompletions = completions
      .filter((c) => c.dateKey >= selectedBucket.start && c.dateKey <= selectedBucket.end)
      .map((c) => ({
        kind: 'task',
        ts: c.ts || null,
        dateKey: c.dateKey,
        personId: c.personId,
        points: c.points,
        label: tasks.find((t) => t.id === c.taskId)?.title || 'Aufgabe',
      }));
    const fromAdjustments = adjustments
      .filter((a) => dkey(new Date(a.ts)) >= selectedBucket.start && dkey(new Date(a.ts)) <= selectedBucket.end)
      .map((a) => ({
        kind: 'adjustment',
        ts: a.ts || null,
        dateKey: dkey(new Date(a.ts)),
        personId: a.personId,
        points: a.delta,
        label: a.reason || (a.delta > 0 ? 'Bonus' : 'Abzug'),
      }));
    return [...fromCompletions, ...fromAdjustments].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [selectedBucket, completions, adjustments, tasks]);

  function personName(id) { return people.find((p) => p.id === id)?.name || '?'; }
  function personColor(id) { return people.find((p) => p.id === id)?.color || 'var(--text-faint)'; }

  return (
    <div>
    <div className="segmented" style={{ marginBottom: 16 }}>
      {Object.keys(GRANULARITY_LABELS).map((g) => (
        <button key={g} className={granularity === g ? 'active' : ''} onClick={() => { setGranularity(g); setSelectedBucketIdx(null); }}>
          {GRANULARITY_LABELS[g]}
        </button>
      ))}
    </div>

    <div className="stats-legend">
      {people.map((p) => (
        <span key={p.id} className="stats-legend-item"><span className="dot" style={{ background: p.color }}></span>{p.name}</span>
      ))}
    </div>

    <div className="stats-chart-scroll">
      <div className="stats-chart">
        {data.map((b, i) => (
          <button type="button" key={i} className={'stats-bucket' + (selectedBucketIdx === i ? ' selected' : '')}
            onClick={() => setSelectedBucketIdx(selectedBucketIdx === i ? null : i)}>
            <div className="stats-bar-group">
              {people.map((p) => (
                <div key={p.id} className="stats-bar" title={`${p.name}: ${b.perPerson[p.id]}`}
                  style={{ height: `${Math.max(2, (b.perPerson[p.id] / maxValue) * 100)}%`, background: p.color }} />
              ))}
            </div>
            <div className="stats-bucket-label">{b.label}</div>
          </button>
        ))}
      </div>
    </div>

    <div className="stats-table-scroll">
      <table className="stats-table">
        <thead>
          <tr>
            <th></th>
            {people.map((p) => <th key={p.id} style={{ color: p.color }}>{p.name}</th>)}
            <th>Gesamt</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b, i) => (
            <tr key={i} className={selectedBucketIdx === i ? 'selected' : ''} onClick={() => setSelectedBucketIdx(selectedBucketIdx === i ? null : i)}>
              <td>{b.label}</td>
              {people.map((p) => <td key={p.id} className="mono">{b.perPerson[p.id]}</td>)}
              <td className="mono" style={{ fontWeight: 800 }}>{b.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {selectedBucket && (
      <div className="stats-detail">
        <div className="stats-detail-title">Details: {selectedBucket.label}</div>
        {detailItems.length === 0 && <div className="empty-note">Keine Einträge in diesem Zeitraum.</div>}
        {detailItems.map((item, i) => (
          <div key={i} className="stats-detail-row" style={{ '--dot': personColor(item.personId) }}>
            <span className="stats-detail-date mono">{item.dateKey.slice(8, 10)}.{item.dateKey.slice(5, 7)}.{item.ts ? ' ' + fmtTime(item.ts) : ''}</span>
            <span className="stats-detail-label">{item.label} · {personName(item.personId)}</span>
            <span className="stats-detail-pts mono" style={{ color: item.points >= 0 ? 'var(--gold)' : 'var(--danger)' }}>
              {item.points >= 0 ? '+' : ''}{item.points}
            </span>
          </div>
        ))}
      </div>
    )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Protokoll: every action with its exact timestamp
// ---------------------------------------------------------------------------
const RANGES = { today: 'Heute', week: '7 Tage', month: '30 Tage', all: 'Alles' };
const PAGE_SIZE = 200;

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function fmtTime(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function fmtTimeSec(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function fmtDate(ts) {
  const d = new Date(ts);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}
function fmtDayHeader(ts) {
  const d = new Date(ts);
  return `${DOW[(d.getDay() + 6) % 7]}, ${fmtDate(ts)}`;
}
function startOfDayTs(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
function middayOf(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}
function csvCell(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

export function Protocol({ people, tasks, completions, adjustments, redemptions, activityLog }) {
  const [personFilter, setPersonFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [range, setRange] = useState('week');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  function personName(id) { return people.find((p) => p.id === id)?.name || null; }
  function personColor(id) { return people.find((p) => p.id === id)?.color || 'var(--text-faint)'; }

  // Logged actions + older records from before logging existed (no log entry
  // refers to them). Older completions only know the date, not the time.
  const entries = useMemo(() => {
    const loggedRefs = new Set(activityLog.map((e) => e.refId).filter(Boolean));
    const out = activityLog.map((e) => ({ ...e }));
    completions.forEach((c) => {
      if (loggedRefs.has(c.id)) return;
      out.push({
        id: 'legacy-c-' + c.id, type: 'task_done', ts: c.ts || middayOf(c.dateKey), timeKnown: !!c.ts,
        personId: c.personId, personName: personName(c.personId),
        label: tasks.find((t) => t.id === c.taskId)?.title || 'Aufgabe', points: c.points, dateKey: c.dateKey, source: 'legacy',
      });
    });
    adjustments.forEach((a) => {
      if (loggedRefs.has(a.id)) return;
      out.push({ id: 'legacy-a-' + a.id, type: 'points_adjusted', ts: a.ts, personId: a.personId, personName: personName(a.personId),
        label: a.reason || (a.delta > 0 ? 'Bonus' : 'Abzug'), points: a.delta, source: 'legacy' });
    });
    redemptions.forEach((r) => {
      if (loggedRefs.has(r.id)) return;
      out.push({ id: 'legacy-r-' + r.id, type: 'points_redeemed', ts: r.ts, personId: r.personId, personName: personName(r.personId),
        label: r.name, points: -r.cost, source: 'legacy' });
    });
    return out.filter((e) => e.ts).sort((a, b) => b.ts - a.ts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLog, completions, adjustments, redemptions, tasks, people]);

  const filtered = useMemo(() => {
    const now = new Date();
    const from = range === 'today' ? startOfDayTs(now)
      : range === 'week' ? startOfDayTs(addDays(now, -6))
      : range === 'month' ? startOfDayTs(addDays(now, -29)) : 0;
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (e.ts < from) return false;
      if (personFilter !== 'all' && e.personId !== personFilter) return false;
      const meta = ACTION_TYPES[e.type];
      if (categoryFilter !== 'all' && meta?.category !== categoryFilter) return false;
      if (q) {
        const hay = `${e.label || ''} ${e.details || ''} ${e.personName || ''} ${meta?.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, personFilter, categoryFilter, range, search]);

  const visible = filtered.slice(0, limit);
  const netPoints = filtered.reduce((s, e) => s + (e.points || 0), 0);

  // group visible rows by calendar day
  const groups = [];
  visible.forEach((e) => {
    const key = dkey(new Date(e.ts));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, ts: e.ts, items: [e] });
  });

  function sourceLabel(e) {
    if (e.source === 'legacy') return 'Altbestand';
    const base = e.source === 'kiosk' ? 'Kiosk' : 'App';
    return e.admin ? `${base} · Admin` : base;
  }

  function exportCsv() {
    const header = ['Datum', 'Uhrzeit', 'Person', 'Aktion', 'Bezeichnung', 'Details', 'Punkte', 'Quelle'];
    const rows = filtered.map((e) => [
      fmtDate(e.ts), e.timeKnown === false ? '' : fmtTimeSec(e.ts), e.personName || '',
      ACTION_TYPES[e.type]?.label || e.type, e.label || '', e.details || '', e.points ?? '', sourceLabel(e),
    ]);
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-planner-protokoll-${dkey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="stats-filters">
        <div className="segmented">
          {Object.entries(RANGES).map(([k, label]) => (
            <button key={k} className={range === k ? 'active' : ''} onClick={() => { setRange(k); setLimit(PAGE_SIZE); }}>{label}</button>
          ))}
        </div>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setLimit(PAGE_SIZE); }}>
          <option value="all">Alle Aktionen</option>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <input type="text" value={search} placeholder="Suchen…" onChange={(e) => { setSearch(e.target.value); setLimit(PAGE_SIZE); }} />
      </div>

      <div className="person-pick" style={{ marginBottom: 12 }}>
        <div className={'chip' + (personFilter === 'all' ? ' active' : '')} onClick={() => { setPersonFilter('all'); setLimit(PAGE_SIZE); }}>Alle</div>
        {people.map((p) => (
          <div key={p.id} className={'chip' + (personFilter === p.id ? ' active' : '')} style={{ '--dot': p.color }}
            onClick={() => { setPersonFilter(p.id); setLimit(PAGE_SIZE); }}>
            <span className="dot"></span>{p.name}
          </div>
        ))}
      </div>

      <div className="stats-protocol-summary">
        <span>{filtered.length} Einträge · Punkte gesamt: <strong style={{ color: netPoints >= 0 ? 'var(--gold)' : 'var(--danger)' }}>{netPoints >= 0 ? '+' : ''}{netPoints}</strong></span>
        <button type="button" className="btn-ghost small" onClick={exportCsv} disabled={filtered.length === 0}>⬇ CSV-Export</button>
      </div>

      {filtered.length === 0 && <div className="empty-note">Keine Einträge für diese Auswahl.</div>}

      {groups.map((g) => {
        const dayPoints = g.items.reduce((s, e) => s + (e.points || 0), 0);
        return (
          <div key={g.key} className="stats-day-group">
            <div className="stats-day-header">
              <span>{fmtDayHeader(g.ts)}</span>
              <span className="mono">{g.items.length} Einträge · {dayPoints >= 0 ? '+' : ''}{dayPoints} Pkt.</span>
            </div>
            {g.items.map((e) => {
              const meta = ACTION_TYPES[e.type] || { label: e.type, icon: '•' };
              const undone = e.type === 'task_undone';
              return (
                <div key={e.id} className={'stats-log-row' + (undone ? ' undone' : '')} style={{ '--dot': personColor(e.personId) }}>
                  <span className="stats-log-time mono">{e.timeKnown === false ? '––:––' : fmtTimeSec(e.ts)}</span>
                  <span className="stats-log-icon">{meta.icon}</span>
                  <span className="stats-log-text">
                    <strong>{meta.label}</strong>{e.label ? `: ${e.label}` : ''}
                    {e.personName && <span className="stats-log-person" style={{ color: personColor(e.personId) }}> · {e.personName}</span>}
                    {e.details && <span className="stats-log-details"> ({e.details})</span>}
                    {e.dateKey && (e.type === 'task_done' || e.type === 'task_undone') && e.dateKey !== dkey(new Date(e.ts)) && (
                      <span className="stats-log-details"> – für {e.dateKey.slice(8, 10)}.{e.dateKey.slice(5, 7)}.</span>
                    )}
                  </span>
                  <span className="stats-log-source">{sourceLabel(e)}</span>
                  <span className="stats-log-pts mono" style={{ color: (e.points || 0) >= 0 ? 'var(--gold)' : 'var(--danger)' }}>
                    {e.points ? `${e.points > 0 ? '+' : ''}${e.points}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {filtered.length > visible.length && (
        <button type="button" className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          Weitere {Math.min(PAGE_SIZE, filtered.length - visible.length)} anzeigen
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function StatisticsModal({ people, tasks, completions, adjustments, redemptions, activityLog, onClose }) {
  const [tab, setTab] = useState('overview');
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal stats-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>📊 Statistik</h3>
        <div className="stats-tabs">
          <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Auswertung</button>
          <button className={tab === 'protocol' ? 'active' : ''} onClick={() => setTab('protocol')}>Protokoll</button>
        </div>
        {tab === 'overview'
          ? <Overview people={people} tasks={tasks} completions={completions} adjustments={adjustments} />
          : <Protocol people={people} tasks={tasks} completions={completions} adjustments={adjustments}
              redemptions={redemptions || []} activityLog={activityLog || []} />}
      </div>
    </div>
  );
}
