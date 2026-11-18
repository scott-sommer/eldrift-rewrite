import { openState, peekState, saveState } from '../../persistence/versioned-state';
import type { StatePort } from '../../persistence/versioned-state';
import { copyPlain } from '../../persistence/plain-data';
import { scoutHistorySchema } from './scout-schema';
import { validScoutHeartbeat, scoutLossKind } from './scout-validation';
import type { ScoutHeartbeat, ScoutHistory } from './scout-model';
import { natural } from './validation';
const key = 'scouting/empire';
export function createScoutHistoryStore(port: StatePort) {
  const read = () => peekState(port, key, scoutHistorySchema) ?? scoutHistorySchema.initial();
  function save(current: ScoutHistory): void {
    if (!natural(current.revision + 1)) throw new Error('Scout history revision exhausted');
    current.revision++;
    openState(port, key, scoutHistorySchema);
    saveState(port, key, scoutHistorySchema, current);
  }
  return {
    read,
    heartbeat(value: ScoutHeartbeat): void {
      const snapshot = copyPlain(value);
      if (!validScoutHeartbeat(snapshot)) throw new Error('Invalid scout heartbeat');
      const current = read(), previous = current.active.find(unit => unit.id === snapshot.id);
      if (current.losses.some(loss => loss.id === snapshot.id)) throw new Error('Retired scout identity cannot heartbeat');
      if (previous && snapshot.seenAt < previous.seenAt) throw new Error('Scout heartbeat clock reversed');
      if (previous && previous.home !== snapshot.home) throw new Error('Scout home ownership changed');
      if (JSON.stringify(previous) === JSON.stringify(snapshot)) return;
      current.active = current.active.filter(unit => unit.id !== snapshot.id);
      current.active.push(snapshot);
      save(current);
    },
    retire(id: string, tick: number) {
      if (!natural(tick)) throw new Error('Invalid scout retirement clock');
      const current = read(), active = current.active.find(unit => unit.id === id);
      if (!active) return current.losses.find(loss => loss.id === id);
      if (tick < active.seenAt) throw new Error('Scout retirement clock reversed');
      const kind = scoutLossKind(active, tick);
      const loss = { ...active, detectedAt: tick, kind, failurePending: kind === 'early-disappearance' };
      current.active = current.active.filter(unit => unit.id !== id);
      current.losses.push(loss);
      current.losses = retainedLosses(current);
      save(current);
      return copyPlain(loss);
    },
    acknowledge(id: string): void {
      const current = read(), loss = current.losses.find(item => item.id === id);
      if (!loss?.failurePending) return;
      loss.failurePending = false;
      current.losses = retainedLosses(current);
      save(current);
    },
  };
}
function retainedLosses(current: ScoutHistory) {
  const retained = new Set<string>(), counts = new Map<string, number>();
  let completed = 0;
  for (const loss of [...current.losses].reverse()) {
    const count = counts.get(loss.home) ?? 0;
    if (loss.failurePending || count < 20 && completed < 512) {
      retained.add(loss.id);
      counts.set(loss.home, count + 1);
      if (!loss.failurePending) completed++;
    }
  }
  return current.losses.filter(loss => retained.has(loss.id));
}
