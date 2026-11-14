import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { generateStockRequests } from '../logistics/stock-requests';
import type { TransportStock, TransportSink } from '../logistics/stock-requests';
import { createLogisticsRequests } from '../logistics/request-store';
import { reconcileSupplySources } from '../logistics/reconcile-supply-sources';
import { reconcilePreservationSinks } from '../logistics/reconcile-preservation-sinks';
import { supportOwner } from './support-identity';
export interface SupportCommitment { home: string; target: string; active: boolean; batch: number; lifetime: number }
/** A batch bounds outstanding commitments, not lifetime delivered energy or nominal fleet capacity. */
export function reconcileSupportRequests(state: StatePort, plan: SupportCommitment, sources: readonly TransportStock[],
  sinks: readonly TransportSink[], tick: number): number {
  const owner = supportOwner(plan.home, plan.target);
  if (![plan.batch, plan.lifetime].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid support commitment');
  if (!plan.active && state.read(stateKey('logistics-requests', plan.home)) === undefined) return 0;
  reconcileSupplySources(state, plan.home, owner, tick, plan.active ? sources : []);
  reconcilePreservationSinks(state, plan.home, owner, tick, plan.active ? sinks : []);
  if (!plan.active) return 0;
  const pending = createLogisticsRequests(state, plan.home).pending(tick).filter(request => request.owner === owner);
  const remaining = Math.max(0, plan.batch - pending.reduce((sum, request) => sum + request.quantity, 0));
  if (remaining === 0) return 0;
  return generateStockRequests(state, plan.home, tick, sources, sinks, { owner, namespace: 'recovery-support',
    priority: 2, lifetime: plan.lifetime, maximumQuantity: remaining, maximumNewRequests: 1 });
}
