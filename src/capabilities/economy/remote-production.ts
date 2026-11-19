import { harvestCycleRate } from '../mining/harvest-cycle';
import type { OperatingBody } from './remote-body';
import type { RemoteEconomicsInput } from './remote-model';
/** Different loaded/empty travel estimates are intentional; distance alone is not a fatigue model. */
export function remoteProduction(input: RemoteEconomicsInput, miner: OperatingBody, hauler: OperatingBody) {
  const sourceRate = input.capacity / input.regenerationTicks;
  // Carried-only valuation omits additional overflow capture; it is not a measurement of total native extraction.
  const harvestRate = Math.min(sourceRate,harvestCycleRate(miner.work * input.harvestPower,miner.capacity));
  const tripTicks = input.hauler.outboundTicks + input.hauler.returnTicks + input.hauler.serviceTicks;
  const requiredHaulers = Math.ceil(harvestRate * tripTicks / hauler.capacity);
  const haulers = Math.min(requiredHaulers,input.limits.maximumHaulers);
  const deliveredRate = Math.min(harvestRate,haulers * hauler.capacity / tripTicks);
  return { sourceRate, harvestRate, tripTicks, requiredHaulers, haulers, deliveredRate };
}
