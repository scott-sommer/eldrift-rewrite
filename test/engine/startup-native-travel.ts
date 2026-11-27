import { createNativeStartupMotionGeometry } from '../../src/app/remotes/startup/projection/motion/native';
import { createNativeStartupProjection } from '../../src/app/remotes/startup/projection/native';
import { nativeProjectionOptions } from './startup-native-projection';
import { startupNativeFactsRequest } from './startup-native-facts';
import { createNativeStartupTravel } from '../../src/app/remotes/startup/travel/native';
import { createStartupTravelProgress } from '../../src/features/remotes/startup/travel-progress';
import { sourceMiner, courier } from '../../src/capabilities/spawning/economy-recipes';
import type { StatePort } from '../../src/persistence/versioned-state';
/** Quotes fixed-tile geometry only; ordinary runtime continues its existing movement policy. */
export function snapshotStartupNativeTravel(state: StatePort, home: string, maximumLegs = Game.time === 149 ? 2 : 5, guard: () => boolean = () => true) {
  const target = startupNativeFactsRequest(home), spawn = Game.rooms[home]!.find(FIND_MY_SPAWNS)[0]!, endpoint = Game.rooms[home]!.storage!;
  const measure = createNativeStartupTravel(state,{ availableEnergy: (_home,available) => available },{ maximumRooms: 2,maximumOps: 10000 });
  const progress = createStartupTravelProgress(state,home), before = progress.read();
  const result = measure({ target,spawn: spawn.id,exit: { room: home,x: spawn.pos.x-1,y: spawn.pos.y },collection: { ...target.station,x: target.station.x-1 },
    deposit: { room: home,x: endpoint.pos.x-1,y: endpoint.pos.y },miner: sourceMiner(550)!.parts,courier: courier(200)!.parts,
    traversal: { mode: 'known-safe',username: target.username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 200,maximumRooms: 128,unknownCost: 8,staleCost: 4,keeperCost: 25 } },maximumLegs,guard);
  const after = progress.read();
  const options = result.status === 'complete' ? nativeProjectionOptions(result) : undefined;
  const motionGeometry = result.status === 'complete' ? createNativeStartupMotionGeometry(state)(result,options!.births,guard) : undefined;
  if (options) options.births = [];
  const continuation = result.status === 'complete' && Game.time === 150 ? createNativeStartupProjection(state)(result,options!) : undefined;
  return { ...(motionGeometry ? { motionGeometry } : {}),...(continuation ? { projectionContinuation: continuation } : {}),tick: Game.time,beforeLegs: before.legs.length,afterLegs: after.legs.length,beforeRevision: before.revision,afterRevision: after.revision,result };
}
