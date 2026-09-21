import { weekdaysSummary } from './occurrence';

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${hh < 10 ? '0' : ''}${hh}:${mm < 10 ? '0' : ''}${mm}`;
}

export default function EventDetailsModal({ event, people, onClose }) {
  const endTime = event.time ? addMinutes(event.time, event.durationMinutes || 60) : null;
  const assigned = (event.personIds || []).map((id) => people.find((p) => p.id === id)).filter(Boolean);
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal kiosk-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <div className="kiosk-detail-title" style={{ color: event.color }}>{event.title}</div>
        <div className="kiosk-detail-row">
          <span className="kiosk-detail-icon">🕐</span>
          <span>{event.time ? `${event.time} – ${endTime} Uhr` : 'Ohne feste Uhrzeit'}</span>
        </div>
        {event.recurrence === 'weekly' && (
          <div className="kiosk-detail-row">
            <span className="kiosk-detail-icon">🔁</span>
            <span>Wiederkehrend: {weekdaysSummary(event.weekdays)}</span>
          </div>
        )}
        {assigned.length > 0 && (
          <div className="kiosk-detail-row">
            <span className="kiosk-detail-icon">👤</span>
            <span>{assigned.map((p) => p.name).join(', ')}</span>
          </div>
        )}
        {event.location && (
          <div className="kiosk-detail-row">
            <span className="kiosk-detail-icon">📍</span>
            <span>{event.location}</span>
          </div>
        )}
        <div className="kiosk-detail-row">
          <span className="kiosk-detail-icon">{event.type === 'special' ? '⭐' : '📌'}</span>
          <span>{event.type === 'special' ? 'Sondertermin' : 'Standardtermin'}</span>
        </div>
        {event.description && (
          <div className="kiosk-detail-desc">{event.description}</div>
        )}
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}
