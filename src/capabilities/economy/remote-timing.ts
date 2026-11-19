import type { RemoteEconomicsInput, RemoteHauler, RemoteServiceTiming } from './remote-model';
/** Keep service retirement, replacement overlap and scheduling lead distinct. */
export function remoteMinerTiming(input: RemoteEconomicsInput['miner']): RemoteServiceTiming {
  return remoteServiceTiming(input.lifetime,input.travelTicks,input.returnTicks,input.replacementMargin ?? 0);
}
export function remoteHaulerTiming(input: RemoteHauler): RemoteServiceTiming {
  return remoteServiceTiming(input.lifetime,input.outboundTicks,input.outboundTicks+input.returnTicks+input.serviceTicks,input.replacementMargin ?? 0);
}
export function remoteServiceTiming(lifetime: number, outbound: number, retirement: number, buffer: number): RemoteServiceTiming {
  if (!Number.isFinite(buffer) || buffer < 0) throw new Error('Invalid economic replacement margin');
  if (![lifetime,outbound,retirement,buffer].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid remote service timing');
  const travelTicks = Math.ceil(outbound), retireTicks = Math.ceil(retirement+buffer), marginTicks = Math.ceil(buffer);
  const serviceTicks = lifetime-travelTicks-retireTicks;
  // Spawn completion includes the admission tick; <= replacement admission produces one tick of extra overlap.
  return { travelTicks,retireTicks,marginTicks,serviceTicks,replacementTicks: serviceTicks-marginTicks-1 };
}
