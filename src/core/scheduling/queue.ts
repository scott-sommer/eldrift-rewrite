import type { ScheduleEntry, ScheduledWork } from './model';
export function phase(id: string, interval: number): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % interval;
}
export function prepare(work: readonly ScheduledWork[], tick: number): ScheduleEntry[] {
  const ids = new Set<string>();
  return work.map(item => {
    if (!item.id || ids.has(item.id)) throw new Error(`Duplicate or empty work id: ${item.id}`);
    if (!Number.isSafeInteger(item.interval) || item.interval < 1) throw new Error(`Invalid interval: ${item.id}`);
    ids.add(item.id);
    const offset = (phase(item.id, item.interval) - tick % item.interval + item.interval) % item.interval;
    return { work: item, due: item.urgency === 'urgent' ? tick : tick + offset };
  });
}
export function dueOrder(a: ScheduleEntry, b: ScheduleEntry): number {
  if (a.work.urgency !== b.work.urgency) return a.work.urgency === 'urgent' ? -1 : 1;
  return a.due - b.due || a.work.id.localeCompare(b.work.id);
}
