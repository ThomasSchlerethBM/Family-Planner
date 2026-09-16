import { db } from './firebase';
import { ref, onValue, push, set, remove, update, get } from 'firebase/database';

// Subscribes to a single-object path (e.g. "settings/weather") and calls back
// with its raw value (or null if absent) - unlike listenList, does not
// array-ify children.
export function listenValue(path, callback) {
  const r = ref(db, path);
  return onValue(r, (snap) => callback(snap.exists() ? snap.val() : null));
}

// Subscribes to a list path (e.g. "events") and calls back with an array
// of {id, ...fields}. Returns an unsubscribe function.
export function listenList(path, callback) {
  const r = ref(db, path);
  return onValue(r, (snap) => {
    const val = snap.val() || {};
    callback(Object.entries(val).map(([id, v]) => ({ id, ...v })));
  });
}

export function pushItem(path, data) {
  const r = push(ref(db, path));
  set(r, data);
  return r.key;
}

export function setItem(path, id, data) {
  return set(ref(db, `${path}/${id}`), data);
}

export function updateItem(path, id, data) {
  return update(ref(db, `${path}/${id}`), data);
}

export function removeItem(path, id) {
  return remove(ref(db, `${path}/${id}`));
}

// One-time read of a list path, returning the current, authoritative data
// straight from the database (not a possibly-stale React state snapshot).
// Used where correctness matters more than reactivity, e.g. deciding which
// synced items are stale during a Google Calendar sync.
export async function getList(path) {
  const snap = await get(ref(db, path));
  const val = snap.val() || {};
  return Object.entries(val).map(([id, v]) => ({ id, ...v }));
}

// Reads a path and returns just its keys (used e.g. for the googleExcluded set,
// which is a simple {id: true} map rather than a list of objects).
export async function getKeys(path) {
  const snap = await get(ref(db, path));
  return snap.exists() ? Object.keys(snap.val()) : [];
}

// Writes seed data only if the path is still empty (first run).
export async function seedIfEmpty(path, seedObject) {
  const snap = await get(ref(db, path));
  if (!snap.exists()) {
    await set(ref(db, path), seedObject);
  }
}
