import { natural } from './validation';
import { validScoutRoom } from './scout-validation';
import type { ScoutHistory } from './scout-model';
export interface ScoutDangerPolicy { window: number; minimumLosses: number }
/** Early disappearance is a risk signal, never proof of combat or a particular attacker. */
export function scoutDangerRooms(home: string, history: ScoutHistory, tick: number, policy: ScoutDangerPolicy) {
  validate(home, tick, policy);
  const rooms = new Map<string, number[]>();
  for (const loss of history.losses) {
    if (loss.home !== home || loss.kind !== 'early-disappearance') continue;
    if (loss.detectedAt > tick) throw new Error('Scout danger clock reversed');
    if (tick - loss.detectedAt > policy.window) continue;
    const times = rooms.get(loss.position.room) ?? [];
    times.push(loss.detectedAt);
    rooms.set(loss.position.room, times);
  }
  return [...rooms.entries()].filter(([,times]) => times.length >= policy.minimumLosses).map(([room,times]) => {
    times.sort((a,b) => a-b);
    const until = times[times.length - policy.minimumLosses]! + policy.window + 1;
    if (!natural(until)) throw new Error('Scout danger clock overflow');
    return { room, count: times.length, until };
  }).sort((a,b) => a.room.localeCompare(b.room));
}
function validate(home: string, tick: number, policy: ScoutDangerPolicy): void {
  if (!validScoutRoom(home) || !natural(tick)) throw new Error('Invalid scout danger identity/clock');
  if (!natural(policy.window) || !natural(policy.minimumLosses) || policy.minimumLosses < 1) throw new Error('Invalid scout danger policy');
}
