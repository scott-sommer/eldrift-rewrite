import type { StatePort } from '../../persistence/versioned-state';
import { reconcileSupplySources } from './reconcile-supply-sources';
/** Energy policy cannot retire another resource's work even when it shares the same owner. */
export function reconcileEnergySources(state: StatePort, room: string, owner: string, tick: number,
  sources: readonly { id: string; amount: number; minimumBatch?: number }[]): number {
  return reconcileSupplySources(state, room, owner, tick, sources.map(source => ({ ...source, resource: 'energy' })), 'energy');
}
