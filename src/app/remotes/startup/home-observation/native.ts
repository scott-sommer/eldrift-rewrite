import { observePaidHomeControl } from './control';
import { observePaidHomeEcology } from './ecology';
import { logisticsPool } from '../../../../capabilities/logistics/request';
import { joinPaidHomeInventories } from './inventory';
import { createReadOnlyStateSnapshot } from '../../../../persistence/read-snapshot';
import { copyPlain } from '../../../../core/plain-data';
import { paidHomeAssets } from './assets';
import { observePaidHomeSource } from './sources';
import { paidHomeClaims } from './claims';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { StartupStructures } from '../model';
import type { PaidHomeObservationRequest,PaidHomeObservationResult } from './model';
/** Before dispatch, after cohort qualification. Snapshot facts only; never changes routes, claims or financial authority. */
export function createNativePaidHomeObservation(state: StatePort,structures: StartupStructures) {
  return (request: PaidHomeObservationRequest,guard: () => boolean = () => true): PaidHomeObservationResult => {
    if (!validRequest(request) || !guard()) return { status: 'deferred',reason: 'home-observation-scope' };
    try { return observe(createReadOnlyStateSnapshot(state),structures,request,guard); } catch { return { status: 'deferred',reason: 'home-observation-state' }; }
  };
}
function observe(state: StatePort,structures: StartupStructures,request: PaidHomeObservationRequest,guard: () => boolean): PaidHomeObservationResult {
  const tick = Game.time,assets = paidHomeAssets(state,structures,request.home,request.endpoint,guard);
  if (!assets) return { status: 'deferred',reason: 'home-observation-assets' };
  const sources = [];
  for (const group of request.groups) {
    const source = observePaidHomeSource(state,group,request.requireActivated,guard);
    if (!source) return { status: 'deferred',reason: 'home-observation-source-or-route' };
    sources.push(source);
  }
  const control = observePaidHomeControl(state,tick);
  const joined = joinPaidHomeInventories(assets.inventories,sources);
  let capture: ReturnType<typeof observePaidHomeEcology>;
  try { capture = observePaidHomeEcology(request.home,sources,assets.workers,joined,guard); }
  catch { return { status: 'deferred',reason: 'home-observation-ecology' }; }
  const { inventories,ecology } = capture;
  const claims = paidHomeClaims(assets.claims,[...assets.pools,...inventories.flatMap(store => [store.capacityPool,logisticsPool('stock',store.id,'energy')])],sources);
  if (!guard() || tick !== Game.time) return { status: 'deferred',reason: 'home-observation-frame' };
  return { status: 'ready',observation: copyPlain({ observedAt: tick,home: request.home,endpoint: assets.endpoint,stock: assets.stock,spawns: assets.spawns,control,ecology,inventories,bodies: assets.bodies,workers: assets.workers,sources,claims }) };
}
function validRequest(request: PaidHomeObservationRequest): boolean {
  if (!request.home || !request.endpoint || !request.groups.length || request.groups.length > 8) return false;
  if (request.groups.some(group => group.cohort.home !== request.home || group.cohort.endpoint !== request.endpoint)) return false;
  const sources = request.groups.map(group => JSON.stringify([group.cohort.room,group.cohort.source]));
  const names = request.groups.flatMap(group => group.cohort.workers.map(worker => worker.request));
  return new Set(sources).size === sources.length && names.length <= 64 && new Set(names).size === names.length;
}
