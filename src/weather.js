const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️', 56: '🌦️', 57: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export function weatherIcon(code) { return WMO_ICONS[code] || '🌡️'; }

// Turns a city/place name into coordinates. No key needed.
export async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=de&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding fehlgeschlagen');
  const data = await res.json();
  const r = data.results && data.results[0];
  if (!r) return null;
  return {
    lat: r.latitude,
    lon: r.longitude,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
  };
}

// Hourly forecast for up to 16 days ahead.
export async function fetchHourlyWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&timezone=Europe%2FBerlin&forecast_days=16`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Wetterabruf fehlgeschlagen');
  const data = await res.json();
  return data.hourly; // { time: [...], temperature_2m: [...], weathercode: [...] }
}

const DAYPART_HOURS = { morning: 8, midday: 13, evening: 19 };

// Picks representative morning/midday/evening readings for one date (YYYY-MM-DD).
export function buildDayWeather(hourly, dateKey) {
  if (!hourly || !hourly.time) return null;
  const result = {};
  let any = false;
  for (const [part, hour] of Object.entries(DAYPART_HOURS)) {
    const target = `${dateKey}T${hour < 10 ? '0' : ''}${hour}:00`;
    const idx = hourly.time.indexOf(target);
    if (idx === -1) { result[part] = null; continue; }
    any = true;
    result[part] = { temp: Math.round(hourly.temperature_2m[idx]), icon: weatherIcon(hourly.weathercode[idx]) };
  }
  return any ? result : null;
}
