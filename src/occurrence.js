import { dkey } from './dateUtils';

// Weekday numbers follow JS Date.getDay(): 0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa
export const WEEKDAY_LABELS_MON_FIRST = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' },
];

export const WEEKDAY_PRESETS = {
  all: [0, 1, 2, 3, 4, 5, 6],
  weekdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
};

export function sameWeekdaySet(a, b) {
  if (!a || !b) return false;
  return a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
}

// A task is "daily/recurring" with an optional weekdays filter.
// Missing/empty weekdays = every day (keeps old tasks working unchanged).
export function taskOccursOn(task, dateObj) {
  if (task.freq === 'once') return task.dueDate === dkey(dateObj);
  if (!task.weekdays || task.weekdays.length === 0) return true;
  return task.weekdays.includes(dateObj.getDay());
}

// An event is either a one-off on a specific date, or weekly on chosen weekdays.
export function eventOccursOn(event, dateObj) {
  if (event.recurrence === 'weekly') {
    if (!event.weekdays || event.weekdays.length === 0) return false;
    return event.weekdays.includes(dateObj.getDay());
  }
  return event.date === dkey(dateObj);
}

export function weekdaysSummary(weekdays) {
  if (!weekdays || weekdays.length === 0 || weekdays.length === 7) return 'täglich';
  if (sameWeekdaySet(weekdays, WEEKDAY_PRESETS.weekdays)) return 'wochentags (Mo–Fr)';
  if (sameWeekdaySet(weekdays, WEEKDAY_PRESETS.weekend)) return 'am Wochenende';
  return WEEKDAY_LABELS_MON_FIRST.filter((w) => weekdays.includes(w.value)).map((w) => w.label).join(', ');
}
