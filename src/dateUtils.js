export const DOW = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
export const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

function pad(n) { return n < 10 ? "0" + n : "" + n; }

export function dkey(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
export function sameDay(a, b) { return dkey(a) === dkey(b); }
export function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
export function startOfWeek(d) {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}
export function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function fmtLabelDay(d) {
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
}
export function fmtLabelWeek(d) {
  const s = startOfWeek(d), e = addDays(s, 6);
  return s.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + " – " +
    e.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function fmtLabelMonth(d) { return MONTHS[d.getMonth()] + " " + d.getFullYear(); }

// Firebase Realtime Database keys may not contain . # $ [ ] /
// dateKey uses dashes which are safe, but we still build composite
// keys explicitly to keep things predictable.
export function completionKey(taskId, personId, dateKeyStr) {
  return `${taskId}__${personId}__${dateKeyStr.replaceAll('-', '')}`;
}
