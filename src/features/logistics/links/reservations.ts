import { logisticsPool } from '../../../capabilities/logistics/request';
import type { IntentResult } from '../../../core/execution/action-arbiter';
import { createQuantityReservations } from '../../../persistence/quantities/store';
import type { StatePort } from '../../../persistence/versioned-state';
import type { LinkTransfer, LinkView } from './model';
/** Native intents reserve gross capacity until the next tick, including uncertain throws. */
export function createLinkReservations(state: StatePort, tick: number, owner: string, sinkPool: (id: string) => string) {
  const ledger = createQuantityReservations(state);
  const stockPool = (id: string) => logisticsPool('stock', id, 'energy');
  function available(link: LinkView): LinkView {
    const allocations = ledger.list(tick).flatMap(claim => claim.allocations);
    const booked = (pool: string) => allocations.filter(item => item.pool === pool).reduce((sum, item) => sum + item.amount, 0);
    return { ...link, availableStock: Math.max(0, link.energy - booked(stockPool(link.id))),
      availableCapacity: Math.max(0, link.capacity - link.energy - booked(sinkPool(link.id))) };
  }
  function issue(transfer: LinkTransfer, links: readonly LinkView[], invoke: () => IntentResult | undefined): boolean {
    const scope = 'link-intent:' + JSON.stringify([owner, tick, transfer.source]);
    // Re-entry must not replace or release a previously issued intent's claim.
    if (ledger.list(tick).some(claim => claim.scope === scope)) return false;
    const source = links.find(link => link.id === transfer.source);
    const sink = links.find(link => link.id === transfer.sink);
    if (!source || !sink) return false;
    const stock = stockPool(source.id);
    const capacity = sinkPool(sink.id);
    const accepted = ledger.reserve({ id: scope, scope, owner, holder: source.id, expiresAt: tick + 1,
      allocations: [{ pool: stock, amount: transfer.amount }, { pool: capacity, amount: transfer.amount }] },
    { [stock]: source.energy, [capacity]: sink.capacity - sink.energy }, tick);
    if (!accepted) return false;
    const result = invoke();
    if (result?.status === 'issued') return true;
    ledger.releaseScope(scope);
    return false;
  }
  return { available, issue };
}
