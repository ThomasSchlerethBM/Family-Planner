export const TIME_OF_DAY_ORDER = ['morning', 'midday', 'evening', ''];

export const TIME_OF_DAY_LABELS = {
  morning: '🌅 Morgens',
  midday: '☀️ Mittags',
  evening: '🌙 Abends',
  '': '📌 Jederzeit',
};

// Groups a list of {task, personId} style entries (or any objects) by their
// timeOfDay field, returning [{ key, label, items }] in a fixed, sensible order.
export function groupByTimeOfDay(items, getTimeOfDay) {
  const buckets = { morning: [], midday: [], evening: [], '': [] };
  items.forEach((item) => {
    const t = getTimeOfDay(item) || '';
    (buckets[t] || buckets['']).push(item);
  });
  return TIME_OF_DAY_ORDER
    .map((key) => ({ key, label: TIME_OF_DAY_LABELS[key], items: buckets[key] }))
    .filter((g) => g.items.length > 0);
}
