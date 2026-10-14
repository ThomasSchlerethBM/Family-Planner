import { WEEKDAY_LABELS_MON_FIRST, WEEKDAY_PRESETS } from './occurrence';

export default function WeekdayPicker({ value, onChange }) {
  function toggleDay(day) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  }
  return (
    <div>
      <div className="weekday-presets">
        <button type="button" className="btn-ghost small" onClick={() => onChange(WEEKDAY_PRESETS.all)}>Jeden Tag</button>
        <button type="button" className="btn-ghost small" onClick={() => onChange(WEEKDAY_PRESETS.weekdays)}>Wochentags (Mo–Fr)</button>
        <button type="button" className="btn-ghost small" onClick={() => onChange(WEEKDAY_PRESETS.weekend)}>Wochenende</button>
      </div>
      <div className="weekday-toggles">
        {WEEKDAY_LABELS_MON_FIRST.map((w) => (
          <button type="button" key={w.value}
            className={'weekday-toggle' + (value.includes(w.value) ? ' active' : '')}
            onClick={() => toggleDay(w.value)}>
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}
