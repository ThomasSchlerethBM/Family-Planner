import { useState, useEffect } from 'react';
import { updateItem, pushItem } from './db';

const PRESET_COLORS = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--coral)', 'var(--gold)'];

export default function MembersManager({ people }) {
  const [drafts, setDrafts] = useState({});
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      people.forEach((p) => { if (next[p.id] === undefined) next[p.id] = p.name; });
      return next;
    });
  }, [people]);

  function save(id) {
    const name = (drafts[id] || '').trim();
    if (!name) return;
    updateItem('members', id, { name });
  }

  function addMember() {
    const name = newName.trim();
    if (!name) return;
    const usedColors = people.map((p) => p.color);
    const color = PRESET_COLORS.find((c) => !usedColors.includes(c)) || PRESET_COLORS[people.length % PRESET_COLORS.length];
    pushItem('members', { name, color });
    setNewName('');
  }

  return (
    <div className="card">
      <h3>👪 Familie verwalten</h3>
      {people.map((p) => (
        <div className="member-edit-row" key={p.id}>
          <span className="avatar" style={{ background: p.color }}>{(drafts[p.id] || p.name)[0]}</span>
          <input
            type="text"
            value={drafts[p.id] ?? p.name}
            onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && save(p.id)}
          />
          <button className="btn-ghost small" onClick={() => save(p.id)}>Speichern</button>
        </div>
      ))}
      <div className="member-add-row">
        <input type="text" placeholder="Neues Familienmitglied…" value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addMember()} />
        <button className="btn-ghost small" onClick={addMember}>+ Hinzufügen</button>
      </div>
    </div>
  );
}
