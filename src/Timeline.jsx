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
function layoutLanes(items) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const laneEnds = [];
  const placed = sorted.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.startMin);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(item.endMin); }
    else laneEnds[lane] = item.endMin;
    return { ...item, lane };
  });
  const totalLanes = laneEnds.length || 1;
  return placed.map((p) => ({ ...p, totalLanes }));
}

/**
 * days: [{ key, dayLabel, dateLabel, isToday, events: [{id,title,time,durationMinutes,type,personIds,...}] }]
 * onEventClick: optional (event) => void, used for admin edit-on-click
 * windowStart/windowEnd: optional minutes-from-midnight to force a fixed visible
 * range (e.g. 8:00-16:00) instead of auto-sizing to the events present.
 */
export default function Timeline({ days, resolutionMinutes, onEventClick, windowStart, windowEnd }) {
  const hasWindow = windowStart != null && windowEnd != null && windowEnd > windowStart;

  const { startMin, endMin, timed } = useMemo(() => {
    if (hasWindow) {
      const withTimes = [];
      days.forEach((day) => {
        day.events.forEach((e) => {
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
  days.forEach((day) => { untimedByDay[day.key] = day.events.filter((e) => toMinutes(e.time) === null); });

  const timedByDay = {};
  days.forEach((day) => {
    const items = timed.filter((e) => e.dayKey === day.key);
    timedByDay[day.key] = layoutLanes(items);
  });

  const hasUntimed = Object.values(untimedByDay).some((list) => list.length > 0);

  return (
    <div className="tl-wrap">
      <div className="tl-grid-cols" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div className="tl-corner"></div>
        {days.map((day) => (
          <div key={day.key} className={'tl-daycol-head' + (day.isToday ? ' today' : '')}>
            <div className="tl-daycol-name">{day.dayLabel}</div>
            <div className="tl-daycol-date">{day.dateLabel}</div>
          </div>
        ))}
      </div>

      {hasUntimed && (
        <div className="tl-grid-cols" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div className="tl-gutter-label tl-allday-label">Ohne Zeit</div>
          {days.map((day) => (
            <div key={day.key} className="tl-allday-cell">
              {untimedByDay[day.key].map((e) => (
                <div key={e.id} className="tl-allday-chip" style={{ '--dot': e.type === 'special' ? 'var(--coral)' : 'var(--p1)' }}
                  onClick={() => onEventClick && onEventClick(e)}>
                  {e.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="tl-grid-cols" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
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
              const widthPct = 100 / e.totalLanes;
              return (
                <div key={e.id} className="tl-event"
                  style={{
                    top, height,
                    left: `${e.lane * widthPct}%`, width: `calc(${widthPct}% - 4px)`,
                    '--dot': e.type === 'special' ? 'var(--coral)' : 'var(--p1)',
                  }}
                  onClick={() => onEventClick && onEventClick(e)}>
                  <span className="tl-event-time">{e.time}</span>
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
