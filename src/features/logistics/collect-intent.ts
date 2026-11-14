import type { StatePort } from '../../persistence/versioned-state';
import { createQuantityReservations } from '../../persistence/quantities/store';
import type { IntentResult } from '../../core/execution/action-arbiter';
import { logisticsPool } from '../../capabilities/logistics/request';
import { reserveTransfer } from './reserve-transfer';
export interface CollectionIntent {
  owner: string; holder: string; sink: string; source: string; resource: string;
  stock: number; free: number; maximum: number; minimum: number; sinkPool: string;
}
/** Reserve the exact native collection before issuing; issued/uncertain intents retain claims until the next tick. */
export function issueCollection(state: StatePort, tick: number, intent: CollectionIntent,
  invoke: (amount: number) => IntentResult): IntentResult | undefined {
  const ledger = createQuantityReservations(state);
  const scope = logisticsPool('collection-intent', intent.owner, intent.holder, String(tick));
  if (ledger.list(tick).some(claim => claim.scope === scope)) return undefined;
  const amount = reserveTransfer(state, { id: scope, owner: intent.owner, source: intent.source, sink: intent.sink,
    resource: intent.resource, quantity: intent.maximum, priority: 0, expiresAt: tick + 1 },
  { holder: intent.holder, scope, phase: 'collect', maximum: intent.maximum, expiresAt: tick + 1 },
  { sourceStock: intent.stock, sinkFree: intent.free, minimumCollection: intent.minimum, sinkPool: intent.sinkPool }, tick);
  if (!amount) return undefined;
  const result = invoke(amount);
  if (result.status !== 'issued') ledger.releaseScope(scope);
  return result;
}
