import type { RuntimeConfig } from '../config/model';
import type { StatePort } from '../persistence/versioned-state';
import { planExploration } from '../features/intel/exploration-plan';
import { nativeScoutDepth, nativeScoutIntelPorts, nativeScoutPolicy } from './native-scout-policy';
export function nativeScoutPlan(state: StatePort, home: string, username: string, config: Readonly<RuntimeConfig>,
  assigned: readonly string[], avoid: Readonly<Record<string,number>>, guard: () => boolean) {
  return planExploration({ home, tick: Game.time, assigned, maximumTargets: config.scoutExplorationRooms,
    budget: { depth: nativeScoutDepth(home,config), reads: config.scoutExplorationReads, rooms: config.scoutExplorationRooms },
    policy: nativeScoutPolicy(state,home,username,config,avoid) }, nativeScoutIntelPorts(state), guard);
}
