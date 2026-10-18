import { pushItem } from './db';

// Every action that changes something is written to /activityLog with an exact
// timestamp. Names/titles are stored as plain text at the time of the action so
// the log stays readable even after something is renamed or deleted.
export const ACTION_TYPES = {
  task_done:           { label: 'Aufgabe erledigt',        icon: '✅', category: 'tasks' },
  task_undone:         { label: 'Haken entfernt',          icon: '↩️', category: 'tasks' },
  task_reassigned:     { label: 'Aufgabe umverteilt',      icon: '↪️', category: 'reassign' },
  task_reassign_reset: { label: 'Umverteilung aufgehoben', icon: '🔄', category: 'reassign' },
  points_redeemed:     { label: 'Prämie eingelöst',        icon: '🎁', category: 'points' },
  points_adjusted:     { label: 'Punkte angepasst',        icon: '⚖️', category: 'points' },
  event_created:       { label: 'Termin angelegt',         icon: '📅', category: 'admin' },
  event_updated:       { label: 'Termin geändert',         icon: '📅', category: 'admin' },
  event_deleted:       { label: 'Termin entfernt',         icon: '📅', category: 'admin' },
  task_created:        { label: 'Aufgabe angelegt',        icon: '📝', category: 'admin' },
  task_updated:        { label: 'Aufgabe geändert',        icon: '📝', category: 'admin' },
  task_deleted:        { label: 'Aufgabe gelöscht',        icon: '📝', category: 'admin' },
  reward_created:      { label: 'Prämie angelegt',         icon: '🏷️', category: 'admin' },
  reward_updated:      { label: 'Prämie geändert',         icon: '🏷️', category: 'admin' },
  reward_deleted:      { label: 'Prämie gelöscht',         icon: '🏷️', category: 'admin' },
  member_added:        { label: 'Person hinzugefügt',      icon: '👪', category: 'admin' },
  member_renamed:      { label: 'Person umbenannt',        icon: '👪', category: 'admin' },
};

export const CATEGORY_LABELS = {
  tasks: 'Aufgaben',
  points: 'Punkte & Prämien',
  reassign: 'Umverteilungen',
  admin: 'Verwaltung (Admin)',
};

// entry: { type, personId?, personName?, label?, details?, points?, dateKey?, refId?, admin?, ts? }
// Firebase rejects `undefined`, so missing fields are stored as null.
export function logAction(entry, source = 'app') {
  const ts = entry.ts || Date.now();
  const clean = {};
  Object.entries({ ...entry, ts, source }).forEach(([k, v]) => { clean[k] = v === undefined ? null : v; });
  pushItem('activityLog', clean);
  return ts;
}
