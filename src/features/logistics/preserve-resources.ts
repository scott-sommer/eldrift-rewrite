import type { StatePort } from '../../persistence/versioned-state';
import { generateStockRequests } from './stock-requests';
import type { TransportStock, TransportSink, StockRequestPolicy } from './stock-requests';
export type RecoverableStock = TransportStock;
export type PreservationSink = TransportSink;
export type PreservationPolicy = Omit<StockRequestPolicy, 'namespace' | 'priority'>;
/** The preservation observer supplies only perishable objects, never stored stock. */
export function preserveResources(state: StatePort, room: string, tick: number, sources: readonly RecoverableStock[],
  sinks: readonly PreservationSink[], policy: PreservationPolicy): number {
  return generateStockRequests(state, room, tick, sources, sinks, { ...policy, namespace: 'preserve', priority: 10 });
}
