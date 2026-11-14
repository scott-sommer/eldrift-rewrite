import type { StatePort } from '../../persistence/versioned-state';
import type { TransportStock, TransportSink } from '../logistics/stock-requests';
import { reconcileTransportCommitment } from '../logistics/transport-commitment';
import { supportOwner } from './support-identity';
export interface SupportCommitment { home: string; target: string; active: boolean; batch: number; lifetime: number }
/** Recovery owns route policy; the transport mechanism owns outstanding commitments. */
export function reconcileSupportRequests(state: StatePort, plan: SupportCommitment, sources: readonly TransportStock[],
  sinks: readonly TransportSink[], tick: number): number {
  return reconcileTransportCommitment(state, { ...plan, owner: supportOwner(plan.home, plan.target),
    namespace: 'recovery-support', priority: 2 }, sources, sinks, tick);
}
