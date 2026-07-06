import { dkey, addDays } from './dateUtils';

const today = new Date();
const d = (offset) => dkey(addDays(today, offset));

export const SEED_MEMBERS = {
  papa:  { name: 'Papa',   color: 'var(--p1)' },
  mama:  { name: 'Mama',   color: 'var(--p2)' },
  tim:   { name: 'Tim',    color: 'var(--p3)' },
  kind2: { name: 'Kind 2', color: 'var(--p4)' },
};

export const SEED_EVENTS = {
  e1: { title: 'Fußballtraining', date: d(1), time: '16:00', personIds: ['tim'], type: 'recurring', source: 'local' },
  e2: { title: 'Musikschule', date: d(3), time: '15:30', personIds: ['kind2'], type: 'recurring', source: 'local' },
  e3: { title: 'Zahnarzt Tim', date: d(4), time: '09:15', personIds: ['tim', 'mama'], type: 'special', source: 'local' },
  e4: { title: 'Omas Geburtstag', date: d(9), time: '', personIds: ['papa', 'mama', 'tim', 'kind2'], type: 'special', source: 'local' },
  e5: { title: 'Müllabfuhr (Restmüll)', date: d(2), time: '07:00', personIds: [], type: 'recurring', source: 'local' },
};

export const SEED_TASKS = {
  t1: { title: 'Zähne putzen', points: 5, freq: 'daily', personIds: ['tim', 'kind2'] },
  t2: { title: 'Bett machen', points: 5, freq: 'daily', personIds: ['tim', 'kind2'] },
  t3: { title: 'Spülmaschine ausräumen', points: 5, freq: 'daily', personIds: ['papa', 'mama', 'tim', 'kind2'] },
  t4: { title: 'Zimmer aufräumen/saugen', points: 20, freq: 'daily', personIds: ['tim', 'kind2'] },
  t5: { title: 'Altglas wegbringen', points: 10, freq: 'once', dueDate: d(2), personIds: ['papa'] },
  t6: { title: 'Paket von der Post abholen', points: 10, freq: 'once', dueDate: d(0), personIds: ['mama'] },
};

export const SEED_REWARDS = {
  r1: { name: '1 Std. Gaming-Zeit', cost: 50 },
  r2: { name: 'Eis essen gehen', cost: 50 },
  r3: { name: 'Filmabend aussuchen', cost: 30 },
  r4: { name: 'Ausflug nach Wahl', cost: 120 },
};
