import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { startupFactContext } from './facts-context';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import { startupHomeStock, startupClaimedPools } from './stock';
import { observeStartupEndpoint } from './endpoint-facts';
import { observeStartupStation } from './station-facts';
import { observeStartupWorkers } from './worker-facts';
import type { StatePort } from '../../../persistence/versioned-state';
import type { StartupStructures } from './model';
import type { StartupFactsRequest, StartupFactsResult } from './facts-model';
/** Native observation boundary only; no route, schedule, demand, claims or income are invented. */
export function createNativeStartupFacts(state: StatePort, structures: StartupStructures) {
  const assignments = createRemoteAssignmentStore(state);
  return (request: StartupFactsRequest, guard: () => boolean = () => true): StartupFactsResult => {
    validateRequest(request);
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    const context = startupFactContext(request,assignments);
    if (context.status === 'deferred') return context;
    const { home,room,source,authority } = context;
    const claims = startupClaimedPools(state);
    const station = observeStartupStation(room,request.station,claims), endpoint = observeStartupEndpoint(request.endpoint,home,claims);
    if (!station || !endpoint) return { status: 'deferred',reason: 'station-or-endpoint' };
    const workers = observeStartupWorkers(request.home,request.room,guard);
    if (!workers || !guard()) return { status: 'deferred',reason: 'budget-or-workforce-capacity' };
    return { status: 'observed',facts: { observedAt: Game.time,home: home.name,room: room.name,
      source: sourceFacts(source),
      station: { ...request.station,facts: station },endpoint,stock: startupHomeStock(state,structures,home,claims),workers,
      spawns: spawnFacts(home),
      authority: authority ? { assignment: authority.id,generation: authority.generation,expiresAt: authority.expiresAt } : null,
      reservation: reservationFacts(room) } };
  };
}
function validateRequest(request: StartupFactsRequest): void {
  if (request.tick !== Game.time) throw new Error('Native startup facts tick mismatch');
  if (![request.home,request.room,request.source,request.endpoint,request.username].every(value => typeof value === 'string' && value.length > 0)) throw new Error('Invalid startup fact identity');
  if (request.home === request.room || request.station.room !== request.room || ![request.station.x,request.station.y].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 49)) throw new Error('Invalid startup station');
}
function spawnFacts(home: Room) {
  return home.find(FIND_MY_SPAWNS).map(spawn => ({ id: spawn.id,position: movementPosition(spawn.pos),remainingTime: spawn.spawning?.remainingTime ?? 0 })).sort((a,b) => a.id.localeCompare(b.id));
}

function sourceFacts(source: Source) {
  return { id: source.id,position: movementPosition(source.pos),energy: source.energy,capacity: source.energyCapacity,regenerationIn: source.ticksToRegeneration ?? null };
}
function reservationFacts(room: Room) { return room.controller?.reservation ? { ...room.controller.reservation } : null; }
