import { createStartupSpawnFunding } from './spawn-funding';
import { allocateSpawns } from '../../spawning/allocate';
import { forecastStartupCash } from './cash';
import { startupFlowDue } from './flow';
import { validateStartupSpawns } from './spawn-validation';
import type { StartupCashFlow } from './cash-model';
import type { StartupSpawnInput, StartupScheduledBirth, StartupSpawnForecast } from './spawn-model';
/** Feasible under supplied availability/flows, not a native admission or a guarantee of projected income. */
export function forecastStartupSpawns(input: StartupSpawnInput): StartupSpawnForecast {
  validateStartupSpawns(input);
  const slots = input.spawns.map(spawn => ({ ...spawn })), pending = new Map(input.requests.map(request => [request.id,request]));
  const births: StartupScheduledBirth[] = [], flows: StartupCashFlow[] = input.cash.flows.map(flow => ({ ...flow }));
  const funding = createStartupSpawnFunding(input.funding,input.cash.homeEnergy);
  for (let tick = 0; tick <= input.cash.horizon; tick++) {
    const external = input.cash.flows.filter(flow => startupFlowDue(flow,tick));
    funding.spend(external.filter(flow => flow.kind !== 'delivery').reduce((sum,flow) => sum+flow.energy,0));
    const available = slots.map(spawn => ({ id: spawn.id,room: spawn.room,busy: spawn.availableAt > tick }));
    const allocations = allocateSpawns([...pending.values()],available,{ [input.room]: funding.available(input.cash.protectedEnergy) },input.liveNames,tick,input.unaffordable);
    for (const allocation of allocations) {
      const activeAt = tick+allocation.request.body.length*3;
      births.push({ request: allocation.request.id,spawn: allocation.spawn,startAt: tick,activeAt,cost: allocation.cost });
      flows.push({ id: 'birth:'+allocation.request.id,kind: 'birth',energy: allocation.cost,firstTick: tick,interval: null,occurrences: 1 });
      slots.find(spawn => spawn.id === allocation.spawn)!.availableAt = activeAt;
      pending.delete(allocation.request.id); funding.spend(allocation.cost);
    }
    funding.refill(tick);
    funding.receive(external.filter(flow => flow.kind === 'delivery').reduce((sum,flow) => sum+flow.energy,0));
  }
  const unscheduled = [...pending.values()].map(request => ({ request: request.id,reason: unscheduledReason(input,request.name,request.expiresAt) }));
  return { births,unscheduled,flows,funding: funding.result(),cash: forecastStartupCash({ ...input.cash,flows }) };
}
function unscheduledReason(input: StartupSpawnInput, name: string, expiresAt: number): 'live-name' | 'expired' | 'horizon' {
  if (input.liveNames.has(name)) return 'live-name';
  return expiresAt <= input.cash.horizon ? 'expired' : 'horizon';
}
