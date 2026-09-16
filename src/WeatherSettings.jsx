import { useState } from 'react';
import { setItem } from './db';
import { geocodeCity } from './weather';

export default function WeatherSettings({ location }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await geocodeCity(query.trim());
      if (!result) {
        setError('Ort nicht gefunden.');
      } else {
        await setItem('settings', 'weather', result);
        setQuery('');
      }
    } catch {
      setError('Suche fehlgeschlagen.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="card">
      <h3>🌤️ Wetter-Standort</h3>
      <div className="help-text" style={{ marginBottom: 10 }}>
        Für die Wetter-Mini-Tabelle in der Kalenderansicht (morgens/mittags/abends).
        {location && <> Aktuell: <strong>{location.label}</strong>.</>}
      </div>
      <div className="field row">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Ort eingeben, z. B. Bruckmühl" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        <button type="button" className="btn-ghost small" disabled={searching || !query.trim()} onClick={handleSearch}>
          {searching ? '…' : 'Suchen'}
        </button>
      </div>
      {error && <div className="gcal-error">{error}</div>}
    </div>
  );
}
