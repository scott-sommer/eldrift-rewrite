import type { RuntimeConfig } from '../../../config/model';
import type { RemoteManagementPolicy } from '../../../features/remotes/management/model';
import type { IntelTraversalPolicy } from '../../../features/intel/traversal-model';
import { sourceMiner, courier } from '../../../capabilities/spawning/economy-recipes';
export function nativeRemoteTraversal(home: Room, config: Readonly<RuntimeConfig>): IntelTraversalPolicy {
  return nativeRemoteTraversalFor(home.controller!.owner!.username,config);
}
export function nativeRemoteTraversalFor(username: string, config: Readonly<RuntimeConfig>): IntelTraversalPolicy {
  return { mode: 'known-safe',username,allies: config.allies,blockedRooms: config.remoteBlockedRooms,avoidUntil: {},
    allowKeeper: false,maximumAge: config.intelMaximumAge,maximumRooms: 128,unknownCost: 8,staleCost: 4,keeperCost: 25 };
}
/** Ordinary neutral-room policy; reservation and specialist support require separately feasible/priceable population policies. */
export function nativeRemoteManagementPolicy(home: Room, candidates: readonly string[], config: Readonly<RuntimeConfig>): RemoteManagementPolicy | undefined {
  const miner = sourceMiner(Math.min(home.energyCapacityAvailable,config.remoteMinerBodyBudget));
  const hauler = courier(Math.min(home.energyCapacityAvailable,config.remoteCourierBodyBudget));
  if (!miner || !hauler) return undefined;
  return { candidates: candidates.map(room => ({ room,commitment: { atomic: false,slots: 0,energyPerTick: 0,spawnLoad: 0 } })),
    traversal: nativeRemoteTraversal(home,config),
    economics: { regenerationTicks: ENERGY_REGEN_TIME,harvestPower: HARVEST_POWER,
      miner: { body: miner.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25 },
      hauler: { body: hauler.parts,lifetime: CREEP_LIFE_TIME,replacementMargin: 25,serviceTicks: 2 },
      reservation: { energyPerTick: 0,spawnLoad: 0,shares: 1 },infrastructurePerTick: config.remoteInfrastructurePerTick,riskPerTick: config.remoteRiskPerTick,
      limits: { maximumHaulers: config.remoteMaximumHaulers,maximumSpawnLoad: config.remoteMaximumSpawnLoad,minimumNetYield: config.remoteMinimumNetYield } },
    portfolio: { maximumUnits: config.remoteWorkerMaximumUnits,maximumAge: config.intelMaximumAge,maximumSlots: config.remoteMaximumSlots,maximumHaulers: config.remoteMaximumHaulers,
      maximumSpawnLoad: config.remoteMaximumSpawnLoad,minimumNetYield: config.remoteMinimumNetYield,completionBonus: config.remoteCompletionBonus,order: config.remoteSelectionOrder },
    infrastructure: { roads: config.remoteRoadsEnabled,containers: config.remoteContainersEnabled },reserve: false,
    leaseLifetime: config.remoteLeaseLifetime,scanLifetime: config.remoteScanLifetime,reassessInterval: config.remoteReassessInterval };
}
