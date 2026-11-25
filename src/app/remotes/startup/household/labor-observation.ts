import { observeWorkAssessment } from '../../../../adapters/screeps/work-assessment';
import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { nativeSpawnDirections } from '../../../../adapters/screeps/spawn-placement';
import { logisticsPool } from '../../../../capabilities/logistics/request';
import { observeStartupEndpoint } from '../endpoint-facts';
import { startupClaimedPools } from '../stock';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { LaborProposalInput, LaborProposalPorts } from '../../../../capabilities/economy/startup/household/labor/proposal-model';
export function createNativeLaborObservation(state: StatePort): LaborProposalPorts['observe'] {
  return input => {
    const home = Game.rooms[input.request.room]; if (!home?.controller?.my) return deferred('home');
    const spawn = Game.getObjectById(input.birth.spawn as Id<StructureSpawn>);
    if (!validSpawn(spawn,home,input)) return deferred('spawn');
    const claims = startupClaimedPools(state), source = observeStartupEndpoint(input.source,home,claims);
    if (!source) return deferred('endpoint');
    const target = targetFacts(home,input); if (!target) return deferred('target');
    const claimedEnergy = claims.get(logisticsPool('stock',source.id,'energy')) ?? 0;
    return { status: 'observed',facts: { spawn: { id: spawn.id,position: movementPosition(spawn.pos) },source: { id: source.id,position: source.position,energy: source.energy,capacity: source.capacity,
      freeCapacity: source.freeCapacity,claimedCapacity: source.claimedCapacity,claimedEnergy,availableEnergy: Math.max(0,source.energy-claimedEnergy) },target } };
  };
}
function targetFacts(home: Room, input: LaborProposalInput) {
  const view = observeWorkAssessment(home), order = input.order;
  const point = selectedPoint(view,order);
  if (!point || point.id !== order.id || (point.position.room !== order.position.room || point.position.x !== order.position.x || point.position.y !== order.position.y)) return undefined;
  const remainingWork = targetRemaining(home,input,view);
  return remainingWork === undefined ? undefined : { id: point.id,position: point.position,kind: order.kind,remainingWork };
}
function targetRemaining(home: Room, input: LaborProposalInput, view: ReturnType<typeof observeWorkAssessment>): number | undefined {
  const order = input.order;
  if (order.kind === 'build') { const site = view.sites.find(item => item.id === order.id); return site && Math.max(0,site.total-site.progress); }
  if (order.kind === 'repair') { const item = view.structures.find(item => item.id === order.id); return item && Math.max(0,Math.min(order.targetHits ?? item.maximum,item.maximum)-item.hits); }
  const controller = home.controller;
  if (!controller?.my || controller.level >= 8 || controller.upgradeBlocked) return undefined;
  return Math.max(0,controller.progressTotal-controller.progress);
}
function deferred(reason: string) { return { status: 'deferred' as const,reason }; }

function selectedPoint(view: ReturnType<typeof observeWorkAssessment>, order: LaborProposalInput['order']) {
  if (order.kind === 'build') return view.sites.find(site => site.id === order.id && site.ready);
  if (order.kind === 'repair') return view.structures.find(item => item.id === order.id && item.eligible && !item.excluded);
  return view.controller;
}
function validSpawn(spawn: StructureSpawn | null, home: Room, input: LaborProposalInput): spawn is StructureSpawn {
  return !!spawn && spawn.structureType === STRUCTURE_SPAWN && spawn.my && spawn.isActive() && spawn.room.name === home.name && nativeSpawnDirections(spawn,input.request) !== null;
}
