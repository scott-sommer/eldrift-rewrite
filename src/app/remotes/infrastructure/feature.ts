import type { StatePort } from '../../../persistence/versioned-state';
import type { RoomFeature } from '../../runtime-model';
import type { RuntimeConfig } from '../../../config/model';
import { createConstructionReservationLedger } from '../../../features/construction/reservation-ledger';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../features/remotes/assignment-demand';
import { createRemoteActorCursor } from '../../../features/remotes/fleet/actor-cursor';
import { nativeRemoteTraversalFor } from '../management/policy';
import { createNativeRemoteInfrastructure } from './native';
/** Lease-owned construction shares admission with owned rooms; path searches and execution stay separately bounded. */
export function createNativeRemoteInfrastructureFeature(state: StatePort,
  ledger: ReturnType<typeof createConstructionReservationLedger>): RoomFeature {
  return { id: 'remote-infrastructure',scope: 'owned',urgency: 'background',interval: 1,run(context) {
    const config = context.config.values, home = context.room.name;
    if (!context.room.owned || !enabled(config)) return;
    if (!Game.rooms[home]?.controller?.my) return;
    const deadline = Math.min(Game.cpu.getUsed()+config.constructionCpuBudget,Game.cpu.tickLimit*config.backgroundCpuFraction);
    const guard = () => Game.cpu.getUsed() < deadline;
    if (!guard()) return;
    const demands = createRemoteAssignmentStore(state).read().assignments.filter(item => item.home === home)
      .flatMap(item => remoteAssignmentDemands(item,Game.time)).filter(item => item.kind === 'outpost').filter(item =>
        (!item.infrastructure.roads || config.remoteRoadsEnabled) && (!item.infrastructure.containers || config.remoteContainersEnabled));
    const cursor = createRemoteActorCursor(state,'infrastructure:'+home);
    const work = createNativeRemoteInfrastructure(state,ledger,{
      guard,policy: (_home,username) => nativeRemoteTraversalFor(username,config),
      maximumRooms: config.remoteMaximumRouteRooms,maximumOps: config.remoteMaximumPathOps,
      sourceSearches: Math.min(16,config.remoteScanSources),roomSites: config.constructionRoomSites,
    });
    let remaining = { rooms: config.remoteMaximumRouteRooms,entries: config.constructionEntries,attempts: config.constructionAttempts };
    let visited = 0;
    for (const item of cursor.order(demands.map(demand => ({ name: demand.room,demand })))) {
      if (!guard() || visited >= config.remoteScanRooms || !available(remaining)) break;
      visited++; cursor.save(item.name);
      work.plan(home,item.demand);
      const results = work.run(home,item.demand,remaining);
      remaining = consume(remaining,results);
    }
  } };
}
function enabled(config: Readonly<RuntimeConfig>): boolean {
  return config.remoteManagementEnabled && config.constructionEnabled && config.remoteScanSources > 0
    && config.constructionRoomSites > 0 && (config.remoteRoadsEnabled || config.remoteContainersEnabled);
}
function available(budget: { rooms: number; entries: number; attempts: number }): boolean {
  return budget.rooms > 0 && budget.entries > 0 && budget.attempts > 0;
}
function consume(budget: { rooms: number; entries: number; attempts: number },
  results: ReturnType<ReturnType<typeof createNativeRemoteInfrastructure>['run']>) {
  const remaining = { ...budget,rooms: budget.rooms-results.length };
  for (const result of results) {
    if (!('result' in result)) continue;
    remaining.entries -= result.result.decisions.length;
    remaining.attempts -= result.result.attempts;
  }
  return remaining;
}
