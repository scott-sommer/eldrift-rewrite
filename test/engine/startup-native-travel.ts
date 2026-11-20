import { startupNativeFactsRequest } from './startup-native-facts';
import { createNativeStartupTravel } from '../../src/app/remotes/startup/travel/native';
import { createStartupTravelProgress } from '../../src/features/remotes/startup/travel-progress';
import { sourceMiner, courier } from '../../src/capabilities/spawning/economy-recipes';
import type { StatePort } from '../../src/persistence/versioned-state';
/** Quotes fixed-tile geometry only; ordinary runtime continues its existing movement policy. */
export function snapshotStartupNativeTravel(state: StatePort, home: string) {
  const target = startupNativeFactsRequest(home), spawn = Game.rooms[home]!.find(FIND_MY_SPAWNS)[0]!, endpoint = Game.rooms[home]!.storage!;
  const measure = createNativeStartupTravel(state,{ availableEnergy: (_home,available) => available },{ maximumRooms: 2,maximumOps: 10000 });
  const progress = createStartupTravelProgress(state,home), before = progress.read();
  const result = measure({ target,spawn: spawn.id,exit: { room: home,x: spawn.pos.x-1,y: spawn.pos.y },collection: { ...target.station,x: target.station.x-1 },
    deposit: { room: home,x: endpoint.pos.x-1,y: endpoint.pos.y },miner: sourceMiner(550)!.parts,courier: courier(200)!.parts,
    traversal: { mode: 'known-safe',username: target.username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 200,maximumRooms: 128,unknownCost: 8,staleCost: 4,keeperCost: 25 } },Game.time === 149 ? 2 : 5);
  const after = progress.read();
  return { tick: Game.time,beforeLegs: before.legs.length,afterLegs: after.legs.length,beforeRevision: before.revision,afterRevision: after.revision,result };
}
