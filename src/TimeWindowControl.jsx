export default function TimeWindowControl({ window, onChange }) {
  const active = !!window;
  return (
    <div className="tw-control">
      <span className="help-text">Zeitfenster:</span>
      <input type="time" value={window?.start || ''} onChange={(e) => onChange({ start: e.target.value || '08:00', end: window?.end || '16:00' })} />
      <span className="help-text">–</span>
      <input type="time" value={window?.end || ''} onChange={(e) => onChange({ start: window?.start || '08:00', end: e.target.value || '16:00' })} />
      <button type="button" className={'icon-btn' + (!active ? ' tw-active' : '')} onClick={() => onChange(null)}>Alle Termine</button>
    </div>
  );
}
