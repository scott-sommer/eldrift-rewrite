import { createNativeHouseholdTravel } from '../../src/app/remotes/startup/household/travel';
import type { NativeStartupQuote } from '../../src/app/remotes/startup/projection/model';
import type { StatePort } from '../../src/persistence/versioned-state';
interface TravelMemory extends Memory { householdTravelProbe?: unknown }
/** Geometry and single-point stock only: deliberately not used as aggregate-room funding authority. */
export function observeHouseholdTravelProbe(state: StatePort, quote: NativeStartupQuote) {
  const plan = quote.plan, before = JSON.stringify(Memory.eldrift);
  const result = createNativeHouseholdTravel(state,4000)({ home: plan.home,body: [...plan.courier],spawn: { ...plan.spawn },
    source: { id: plan.endpoint.id,position: { ...plan.endpoint.position },pickup: { ...plan.endpoint.deposit } },
    destination: { id: plan.spawn.id,position: { ...plan.spawn.position },deposit: { ...plan.spawn.exit } } });
  if (result.status !== 'complete') throw new Error('Expected complete native household travel quote');
  (Memory as TravelMemory).householdTravelProbe = { quote: result,readOnly: before === JSON.stringify(Memory.eldrift),
    aggregateSpawnCapacity: quote.facts.stock.spawnCapacity,use: 'geometry and one observed destination only; no aggregate funding substitution' };
  return result;
}
