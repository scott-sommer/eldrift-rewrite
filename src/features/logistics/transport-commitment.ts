import type { StatePort } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { generateStockRequests } from './stock-requests';
import type { TransportStock, TransportSink } from './stock-requests';
import { createLogisticsRequests } from './request-store';
import { reconcileSupplySources } from './reconcile-supply-sources';
import { reconcilePreservationSinks } from './reconcile-preservation-sinks';
export interface TransportCommitment {
  home: string; owner: string; namespace: string; priority: number; active: boolean; batch: number; lifetime: number;
}
/** Bound outstanding commitments while preserving cargo already in transit when a route stops. */
export function reconcileTransportCommitment(state: StatePort, plan: TransportCommitment, sources: readonly TransportStock[],
  sinks: readonly TransportSink[], tick: number): number {
  if (![plan.batch, plan.lifetime].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Invalid transport commitment');
  if (!plan.active && state.read(stateKey('logistics-requests', plan.home)) === undefined) return 0;
  reconcileSupplySources(state, plan.home, plan.owner, tick, plan.active ? sources : []);
  reconcilePreservationSinks(state, plan.home, plan.owner, tick, plan.active ? sinks : []);
  if (!plan.active) return 0;
  const pending = createLogisticsRequests(state, plan.home).pending(tick).filter(request => request.owner === plan.owner);
  const remaining = Math.max(0, plan.batch - pending.reduce((sum, request) => sum + request.quantity, 0));
  if (remaining === 0) return 0;
  return generateStockRequests(state, plan.home, tick, sources, sinks, { owner: plan.owner, namespace: plan.namespace,
    priority: plan.priority, lifetime: plan.lifetime, maximumQuantity: remaining, maximumNewRequests: 1 });
}
