import { copyPlain } from '../../../../core/plain-data';
import { snapshotStartupProject,snapshotStartupSpawns } from '../snapshot';
import { startupOpeningEnergy } from '../initial';
import { prepareStartupProjectMotion } from '../courier-trips/project-input';
import { tileKey } from '../../../movement/traffic/model';
import type { StartupHomeProjectInput } from './model';
export function prepareStartupHomeProject(raw: StartupHomeProjectInput) {
  validateRoster(raw); validateRequestOwners(raw);
  const spawning = snapshotStartupSpawns(raw.spawning),sink = copyPlain(raw.sink),household = raw.household && copyPlain(raw.household);
  const claimed = raw.sources.flatMap(source => source.requests);
  if (new Set(claimed).size !== claimed.length || claimed.some(id => !spawning.requests.some(request => request.id === id))) throw new Error('Invalid home source request ownership');
  const sourceCash = { ...spawning.cash }; delete sourceCash.openingAssets;
  const sources = raw.sources.map(source => {
    const requests = spawning.requests.filter(request => source.requests.includes(request.id));
    const input = snapshotStartupProject({ ...source,project: { ...source.project,spawning: { ...spawning,requests,cash: sourceCash } },homeSink: sink });
    return { id: source.id,input,motion: prepareStartupProjectMotion(input) };
  });
  const openingAssets = sources.reduce((sum,source) => sum+startupOpeningEnergy(source.input),0);
  if (spawning.cash.openingAssets !== undefined && spawning.cash.openingAssets !== openingAssets) throw new Error('Home opening inventory mismatch');
  spawning.cash.openingAssets = openingAssets;
  validateNames(sources.map(source => source.input),spawning.requests.flatMap(request => [request.name,request.id]));
  const terrain = jointTerrain(sources.map(source => source.motion));
  const blockers = [...new Map(sources.flatMap(source => source.motion.blockers).map(blocker => [JSON.stringify(blocker),blocker])).values()];
  if (blockers.length > 256) throw new Error('Home blocker bound');
  return { spawning,sink,household,sources,terrain,blockers };
}
function validateRoster(raw: StartupHomeProjectInput): void {
  if (!raw.sources.length || raw.sources.length > 8 || new Set(raw.sources.map(source => source.id)).size !== raw.sources.length || raw.sources.some(source => !source.id)) throw new Error('Invalid home source roster');
}
function jointTerrain(motions: readonly ReturnType<typeof prepareStartupProjectMotion>[]) {
  const terrain = new Map<string,{ position: Parameters<typeof tileKey>[0]; rate: 1 | 2 | 10 }>();
  for (const motion of motions) for (const fact of motion.terrain) {
    const key = tileKey(fact.position),previous = terrain.get(key);
    if (previous && previous.rate !== fact.rate) throw new Error('Conflicting home terrain');
    terrain.set(key,fact);
  }
  if (terrain.size > 10000 || motions.reduce((sum,motion) => sum+motion.routes.length,0) > 16) throw new Error('Home motion bound');
  return terrain;
}
function validateNames(inputs: readonly import('../delivery-model').StartupDeliveryInput[],scheduledNames: string[]): void {
  const paid = inputs.flatMap(input => [...(input.initial?.couriers.map(worker => worker.id) ?? []),...(input.initial?.miner ? [input.initial.miner.id] : [])]);
  if (new Set(paid).size !== paid.length || paid.some(name => scheduledNames.includes(name))) throw new Error('Shared home paid body ownership');
}

function validateRequestOwners(raw: StartupHomeProjectInput): void {
  const remote = raw.sources.flatMap(source => source.requests);
  const household = [...(raw.household?.redistribution.trips.map(trip => trip.request) ?? []),...(raw.household?.labor?.jobs.map(job => job.request) ?? [])];
  const owners = new Set([...remote,...household]);
  if (household.some(id => remote.includes(id)) || raw.spawning.requests.some(request => !owners.has(request.id))) throw new Error('Unowned or shared home spawn request');
  for (const source of raw.sources) validateSourceWork(source);
}
function validateSourceWork(source: StartupHomeProjectInput['sources'][number]): void {
    if (!Number.isSafeInteger(source.containerCapacity) || source.containerCapacity < 1 || source.containerCapacity > 1000000) throw new Error('Invalid startup container capacity');
    const work = [...source.project.workers,...source.couriers].map(worker => worker.request);
    if (source.requests.length !== work.length || new Set(work).size !== work.length || work.some(id => !source.requests.includes(id))) throw new Error('Source request/work mismatch');
}

