import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { stateKey } from '../persistence/state-key';
import { createSpawnQueue } from '../features/population/spawn-queue';
import { createScoutControlStore } from '../features/intel/scout-control-store';
import { createIntelStore } from '../features/intel/store';
import { createIntelTraversal } from '../features/intel/traversal';
import { applyPopulationDemand } from '../features/population/apply-demand';
import { observePopulation } from '../adapters/screeps/population';
import { scoutOwner } from '../features/intel/scout-identity';
import { nativeScoutPlan } from './native-scout-plan';
import { nativeScoutIntelPorts, nativeScoutPolicy } from './native-scout-policy';
export function maintainNativeScouts(state: StatePort, home: Room, config: Readonly<RuntimeConfig>, queued: boolean, guard: () => boolean, fallbackRoom?: string): boolean {
  const enabled = config.scoutsEnabled && config.scoutSpawningEnabled && home.controller!.level >= config.scoutMinimumRcl;
  const desired = enabled ? desiredScouts(state,home,config,queued,guard,fallbackRoom) : 0;
  if (desired === undefined) return false;
  applyPopulationDemand(state,{ owner: scoutOwner(home.name), room: home.name, desired, replacementParts: 1,
    body: ['move'], travelTicks: Math.max(config.scoutDepth,config.scoutExtendedDepth)*50,
    marginTicks: 25, priority: 80, requestLifetime: 1500 },observePopulation(),Game.time);
  return desired > 0;
}
function desiredScouts(state: StatePort, home: Room, config: Readonly<RuntimeConfig>, queued: boolean, guard: () => boolean, fallbackRoom?: string): number | undefined {
  const active = createScoutControlStore(state).read().units.filter(unit => unit.home === home.name && unit.objective).length;
  const assigned = assignedDemand(state,home,config,guard,fallbackRoom), known = active+assigned.count;
  if (known >= config.scoutCount) return config.scoutCount;
  if (assigned.incomplete && queued) return undefined;
  if (!refreshDemand(config.scoutDemandInterval,known,queued)) return undefined;
  const plan = nativeScoutPlan(state,home.name,home.controller!.owner!.username,config,[],{},guard);
  const found = known+plan.targets.length;
  const incomplete = plan.incomplete !== undefined || assigned.incomplete !== undefined;
  if (preserveDemand(incomplete,found,config.scoutCount,queued)) return undefined;
  return Math.min(config.scoutCount,found);
}
function assignedDemand(state: StatePort, home: Room, config: Readonly<RuntimeConfig>, guard: () => boolean, fallbackRoom?: string) {
  const policy = nativeScoutPolicy(state,home.name,home.controller!.owner!.username,config);
  const traversal = createIntelTraversal(nativeScoutIntelPorts(state),{ ...policy, maximumRooms: config.scoutAssignedRooms.length + (fallbackRoom ? 1 : 0) },
    Game.time,guard);
  const intel = createIntelStore(state);
  const rooms = new Set(config.scoutAssignedRooms.filter(room => {
    if (!traversal.allows(room)) return false;
    const visit = intel.peek(room,Game.time,config.intelMaximumAge).record.lastVisit;
    return visit === null || Game.time-visit > config.intelMaximumAge;
  }));
  if (fallbackRoom && traversal.allows(fallbackRoom)) rooms.add(fallbackRoom);
  return { count: rooms.size, incomplete: traversal.diagnostics().incomplete };
}
/** Expiration cleanup never requires an exploration result or touches other role owners. */
export function nativeScoutQueued(state: StatePort, room: string): boolean {
  if (state.read(stateKey('spawning',room)) === undefined) return false;
  const queue = createSpawnQueue(state,room), owner = `scout:${room}`;
  const requests = queue.list().filter(request => request.owner === owner);
  for (const request of requests) if (request.expiresAt <= Game.time) queue.cancel(request.id,owner);
  return requests.some(request => request.expiresAt > Game.time);
}

function refreshDemand(interval: number, known: number, queued: boolean): boolean {
  return Game.time%interval === 0 || known > 0 || queued;
}
function preserveDemand(incomplete: boolean, found: number, maximum: number, queued: boolean): boolean {
  return incomplete && (!found || queued && found < maximum);
}
