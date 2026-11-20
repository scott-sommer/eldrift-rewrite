import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { createWorkerBoostPolicy } from '../features/industry/boosts/worker-policy';
import { createBoostRequests } from '../features/industry/boosts/store';
import { terminalBoost } from '../capabilities/industry/boosts/model';
import { isWorkOwner } from '../features/work/identity';
import { nativeBoostBudget } from './native-boost-budget';
export function nativeWorkerBirthBoosts(state: StatePort,room: Room,config: Readonly<RuntimeConfig>) {
  const store = createBoostRequests(state);
  for (const job of store.read()) {
    if (job.request.home !== room.name || !isWorkOwner(job.request.owner,room.name) || !terminalBoost(job) || job.acknowledged) continue;
    if (job.status === 'confirmed' || !job.request.required) store.acknowledge(job.request.owner,job.request.id);
  }
  if (config.workerBoostPolicy === 'off') return undefined;
  const labs = room.find(FIND_MY_STRUCTURES).some(item => item.structureType === STRUCTURE_LAB && item.isActive());
  const available = labs ? nativeBoostBudget(state,room,config) : { minerals: {},energy: 0 };
  return createWorkerBoostPolicy(config,available,{ mineral: LAB_BOOST_MINERAL,energy: LAB_BOOST_ENERGY });
}
