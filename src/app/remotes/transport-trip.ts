import type { Outcome } from '../../core/execution/model';
export interface RemoteTransportTripPorts {
  settle(): void;
  pending(): boolean;
  authorized(): boolean;
  /** Cancel owned work and return home, or refuse if that transition is not modelled. */
  invalidate(): void;
  allowed(): boolean;
  /** Loaded bodies bypass collection in the platform adapter. */
  prepare(): boolean;
  execute(): Outcome | undefined;
  completed(): boolean;
  close(): void;
}
export interface RemoteTransportTripResult {
  status: 'waiting' | 'retired' | 'deferred' | 'preparing' | 'executed';
  outcome?: Outcome;
}
/** Native and private couriers share settlement, authority and execution order. */
export function serviceRemoteTransportTrip(ports: RemoteTransportTripPorts): RemoteTransportTripResult {
  ports.settle();
  if (ports.pending()) return { status: 'waiting' };
  if (!ports.authorized()) { ports.invalidate(); return { status: 'retired' }; }
  if (!ports.allowed()) return { status: 'deferred' };
  if (!ports.prepare()) return { status: 'preparing' };
  const outcome = ports.execute();
  if (ports.completed()) ports.close();
  return { status: 'executed',...(outcome ? { outcome } : {}) };
}
