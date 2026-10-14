import { useMemo } from 'react';

const PX_PER_MIN = 1.05; // vertical scale: ~63px per hour
const DEFAULT_START_MIN = 7 * 60;
const DEFAULT_END_MIN = 21 * 60;
const MIN_BLOCK_HEIGHT = 24;

export const RESOLUTIONS = [
  { value: 15, label: '15 Min' },
  { value: 30, label: '30 Min' },
  { value: 60, label: '60 Min' },
];

function toMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
}

// Simple interval-graph "lane" layout so overlapping events sit side by side
// instead of on top of each other.
// Groups events into clusters of mutually-overlapping items (transitively -
// if A overlaps B and B overlaps C, all three share a cluster even if A and
// C don't directly overlap), then assigns lanes only within each cluster.
// This means an event with nothing overlapping it gets the full day-column
// width, even if other events later that same day do overlap each other.
function layoutLanes(items) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const clusters = [];
  sorted.forEach((item) => {
    let cluster = clusters.find((c) => item.startMin < c.maxEnd);
    if (!cluster) {
      cluster = { events: [], maxEnd: -Infinity };
      clusters.push(cluster);
    }
    cluster.events.push(item);
    cluster.maxEnd = Math.max(cluster.maxEnd, item.endMin);
  });

  const result = [];
  clusters.forEach((cluster) => {
    const laneEnds = [];
    const placed = cluster.events.map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.startMin);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(item.endMin); }
      else laneEnds[lane] = item.endMin;
      return { ...item, lane };
    });
    const totalLanes = laneEnds.length || 1;
    placed.forEach((p) => {
      // let the event widen into free lanes on its right, so it only shares
      // width with events it actually overlaps
      let span = 1;
      for (let l = p.lane + 1; l < totalLanes; l++) {
        const blocked = placed.some((q) => q.lane === l && q.startMin < p.endMin && q.endMin > p.startMin);
        if (blocked) break;
        span++;
      }
      result.push({ ...p, totalLanes, span });
    });
  });
  return result;
}

/**
 * days: [{ key, dayLabel, dateLabel, isToday, events: [{id,title,time,durationMinutes,type,personIds,...}] }]
 * onEventClick: optional (event) => void, used for admin edit-on-click
 * windowStart/windowEnd: optional minutes-from-midnight to force a fixed visible
 * range (e.g. 8:00-16:00) instead of auto-sizing to the events present.
 */
export default function Timeline({ days, resolutionMinutes, onEventClick, windowStart, windowEnd, weatherByDate }) {
  const hasWindow = windowStart != null && windowEnd != null && windowEnd > windowStart;

  const { startMin, endMin, timed } = useMemo(() => {
    if (hasWindow) {
      const withTimes = [];
      days.forEach((day) => {
        day.events.forEach((e) => {
          if (e.multiDay) return;
          const sm = toMinutes(e.time);
          if (sm === null) return;
          const dur = e.durationMinutes || 60;
          withTimes.push({ dayKey: day.key, ...e, startMin: sm, endMin: sm + dur });
        });
      });
      return { startMin: windowStart, endMin: windowEnd, timed: withTimes };
    }
    let minStart = DEFAULT_START_MIN;
    let maxEnd = DEFAULT_END_MIN;
    const withTimes = [];
    days.forEach((day) => {
      day.events.forEach((e) => {
        if (e.multiDay) return;
        const sm = toMinutes(e.time);
        if (sm === null) return;
        const dur = e.durationMinutes || 60;
        withTimes.push({ dayKey: day.key, ...e, startMin: sm, endMin: sm + dur });
        minStart = Math.min(minStart, Math.floor(sm / 60) * 60);
        maxEnd = Math.max(maxEnd, Math.ceil((sm + dur) / 60) * 60);
      });
    });
    return { startMin: minStart, endMin: maxEnd, timed: withTimes };
  }, [days, hasWindow, windowStart, windowEnd]);

  const totalMin = endMin - startMin;
  const gridHeight = totalMin * PX_PER_MIN;
  const hourMarks = [];
  for (let m = startMin; m <= endMin; m += 60) hourMarks.push(m);

  const untimedByDay = {};
  days.forEach((day) => { untimedByDay[day.key] = day.events.filter((e) => !e.multiDay && toMinutes(e.time) === null); });

  const timedByDay = {};
  days.forEach((day) => {
    const items = timed.filter((e) => e.dayKey === day.key);
    timedByDay[day.key] = layoutLanes(items);
  });

  const hasUntimed = Object.values(untimedByDay).some((list) => list.length > 0);

  // Multi-day events: one bar per event, spanning all visible days it covers.
  const barMap = new Map();
  days.forEach((day, idx) => {
    day.events.forEach((e) => {
      if (!e.multiDay) return;
      const entry = barMap.get(e.id);
      if (entry) entry.last = idx;
      else barMap.set(e.id, { event: e, first: idx, last: idx });
    });
  });
  const bars = [...barMap.values()].sort((a, b) => a.first - b.first || (b.last - b.first) - (a.last - a.first));
  const laneEndsBars = [];
  bars.forEach((b) => {
    let lane = laneEndsBars.findIndex((end) => end < b.first);
    if (lane === -1) { lane = laneEndsBars.length; laneEndsBars.push(b.last); }
    else laneEndsBars[lane] = b.last;
    b.lane = lane;
    b.contLeft = !!b.event.date && b.event.date < days[0].key;
    b.contRight = !!b.event.endDate && b.event.endDate > days[days.length - 1].key;
  });
  const barLaneCount = laneEndsBars.length;

  return (
    <div className="tl-wrap">
      <div className="tl-grid-cols" style={{ gridTemplateColumns: `68px repeat(${days.length}, 1fr)` }}>
        <div className="tl-corner">
          {weatherByDate && <div className="tl-weather-legend">🌅 ☀️ 🌙</div>}
        </div>
        {days.map((day) => (
          <div key={day.key} className={'tl-daycol-head' + (day.isToday ? ' today' : '')}>
            <div className="tl-daycol-name">{day.dayLabel}</div>
            <div className="tl-daycol-date">{day.dateLabel}</div>
            {weatherByDate && weatherByDate[day.key] && (
              <div className={'tl-weather-row' + (days.length === 1 ? ' tl-weather-row-lg' : '')}>
                {['morning', 'midday', 'evening'].map((part) => {
                  const w = weatherByDate[day.key][part];
                  return (
                    <span key={part} className="tl-weather-cell">
                      {w ? <>{w.icon}<span className="tl-weather-temp">{w.temp}°</span></> : '–'}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {barLaneCount > 0 && (
        <div className="tl-bars-grid" style={{ gridTemplateColumns: `68px repeat(${days.length}, 1fr)` }}>
          <div className="tl-gutter-label tl-allday-label" style={{ gridColumn: 1, gridRow: `1 / span ${barLaneCount}` }}>Mehrtägig</div>
          {Array.from({ length: barLaneCount }).flatMap((_, lane) =>
            days.map((day, d) => (
              <div key={`c-${lane}-${d}`} className="tl-bar-cell" style={{ gridColumn: d + 2, gridRow: lane + 1 }} />
            ))
          )}
          {bars.map((b) => (
            <div key={b.event.id}
              className={'tl-bar' + (b.contLeft ? ' cont-left' : '') + (b.contRight ? ' cont-right' : '')}
              style={{ gridColumn: `${b.first + 2} / ${b.last + 3}`, gridRow: b.lane + 1, '--dot': b.event.color || 'var(--p1)' }}
              onClick={() => onEventClick && onEventClick(b.event)}>
              {b.contLeft ? '◀ ' : ''}{b.event.title}{b.contRight ? ' ▶' : ''}
            </div>
          ))}
        </div>
      )}

      {hasUntimed && (
        <div className="tl-grid-cols" style={{ gridTemplateColumns: `68px repeat(${days.length}, 1fr)` }}>
          <div className="tl-gutter-label tl-allday-label">Ohne Zeit</div>
          {days.map((day) => (
            <div key={day.key} className="tl-allday-cell">
              {untimedByDay[day.key].map((e) => (
                <div key={e.id} className="tl-allday-chip" style={{ '--dot': e.color || 'var(--p1)' }}
                  onClick={() => onEventClick && onEventClick(e)}>
                  {e.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="tl-grid-cols" style={{ gridTemplateColumns: `68px repeat(${days.length}, 1fr)` }}>
        <div className="tl-gutter" style={{ height: gridHeight }}>
          {hourMarks.map((m) => (
            <div key={m} className="tl-hour-label" style={{ top: (m - startMin) * PX_PER_MIN }}>{formatMinutes(m)}</div>
          ))}
        </div>
        {days.map((day) => (
          <div key={day.key} className={'tl-daycol' + (day.isToday ? ' today' : '')}
            style={{
              height: gridHeight,
              backgroundSize: `100% ${resolutionMinutes * PX_PER_MIN}px`,
            }}>
            {hourMarks.map((m) => (
              <div key={m} className="tl-hour-line" style={{ top: (m - startMin) * PX_PER_MIN }} />
            ))}
            {timedByDay[day.key].map((e) => {
              const top = (e.startMin - startMin) * PX_PER_MIN;
              const height = Math.max(MIN_BLOCK_HEIGHT, (e.endMin - e.startMin) * PX_PER_MIN);
              const laneWidthPct = 100 / e.totalLanes;
              const widthPct = laneWidthPct * (e.span || 1);
              return (
                <div key={e.id} className="tl-event" title={`${e.title} (${e.time})`}
                  style={{
                    top, height,
                    left: `${e.lane * laneWidthPct}%`, width: `calc(${widthPct}% - 4px)`,
                    '--dot': e.color || 'var(--p1)',
                  }}
                  onClick={() => onEventClick && onEventClick(e)}>
                  <span className="tl-event-title">{e.title}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
