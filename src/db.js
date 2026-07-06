import { db } from './firebase';
import { ref, onValue, push, set, remove, update, get } from 'firebase/database';

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

// Writes seed data only if the path is still empty (first run).
export async function seedIfEmpty(path, seedObject) {
  const snap = await get(ref(db, path));
  if (!snap.exists()) {
    await set(ref(db, path), seedObject);
  }
}
