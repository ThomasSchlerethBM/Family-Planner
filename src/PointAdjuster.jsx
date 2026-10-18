import { useState } from 'react';
import { pushItem } from './db';
import { logAction } from './activityLog';

export default function PointAdjuster({ people }) {
  const [personId, setPersonId] = useState(people[0]?.id || '');
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');

  function apply(sign) {
    if (!personId || !amount) return;
    const ts = Date.now();
    const delta = sign * Math.abs(Number(amount) || 0);
    const text = reason.trim() || (sign > 0 ? 'Bonus' : 'Abzug');
    const refId = pushItem('adjustments', { personId, delta, reason: text, ts });
    logAction({ type: 'points_adjusted', personId, personName: people.find((p) => p.id === personId)?.name || null,
      label: text, points: delta, refId, admin: true, ts });
    setReason('');
  }

  return (
    <div className="card">
      <h3>⚖️ Punkte anpassen</h3>
      <div className="field">
        <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="field row">
        <div><label>Punkte</label><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div><label>Grund (optional)</label><input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z. B. Sonderbonus" /></div>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={() => apply(-1)}>− Abziehen</button>
        <button className="btn-primary" onClick={() => apply(1)}>+ Gutschreiben</button>
      </div>
    </div>
  );
}
