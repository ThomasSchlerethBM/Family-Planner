import { useState, useMemo } from 'react';
import { dkey, addDays, startOfWeek, MONTHS } from './dateUtils';

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

export default function StatisticsModal({ people, tasks, completions, adjustments, onClose }) {
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
        dateKey: c.dateKey,
        personId: c.personId,
        points: c.points,
        label: tasks.find((t) => t.id === c.taskId)?.title || 'Aufgabe',
      }));
    const fromAdjustments = adjustments
      .filter((a) => dkey(new Date(a.ts)) >= selectedBucket.start && dkey(new Date(a.ts)) <= selectedBucket.end)
      .map((a) => ({
        kind: 'adjustment',
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
    <div className="modal-bg" onClick={onClose}>
      <div className="modal stats-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h3>📊 Punkte-Statistik</h3>

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
                <span className="stats-detail-date mono">{item.dateKey.slice(8, 10)}.{item.dateKey.slice(5, 7)}.</span>
                <span className="stats-detail-label">{item.label} · {personName(item.personId)}</span>
                <span className="stats-detail-pts mono" style={{ color: item.points >= 0 ? 'var(--gold)' : 'var(--danger)' }}>
                  {item.points >= 0 ? '+' : ''}{item.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
