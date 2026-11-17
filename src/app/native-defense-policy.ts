import { stageDefenseEconomy } from '../features/planning/defense-economy';
import type { NativeDefensePolicy } from './native-planning-defense';
import type { RuntimeConfig } from '../config/model';
import { createCoordinatedCandidateDefense } from '../features/planning/coordinated-candidate-defense';
import { prepareDefensePlan } from '../features/planning/defense-plan-setup';
import { createDefenseSearchStore } from '../features/planning/defense-search-store';
import { createStoredDefenseStrategies } from '../features/planning/stored-defense-strategies';
import { copyPlain } from '../persistence/plain-data';
/** Nominal constants match pinned engine common 2.16.1; no tower energy/effect survival prediction. */
export function nativeDefensePolicy(room: string, config: Readonly<RuntimeConfig>, valuableTypes: readonly string[]): NativeDefensePolicy {
  const settings = { minimumStoredEnergy: config.planningDefenseMinimumStoredEnergy, rcl: config.planningDefenseRcl, scans: config.planningDefenseScans,
    augmentations: config.planningDefenseAugmentations, upkeep: config.planningDefenseUpkeepWeight,
    repair: config.planningDefenseRepairWeight, tower: config.planningDefenseTowerWeight,
    minimumTowerPower: config.planningDefenseMinimumTowerPower,
    maximumUnreachableRepair: config.planningDefenseMaximumUnreachableRepair, valuableTypes: [...valuableTypes] };
  const revision = 'native-defense-v3:economy-reserve:' + JSON.stringify(settings);
  return { revision, prepare(state, observed) {
    const observation = copyPlain(observed), store = createDefenseSearchStore(state, room);
    const defense = createCoordinatedCandidateDefense(revision, (candidate, entries) => {
      const setup = prepareDefensePlan(candidate, entries, observation, {
        valuableTypes: settings.valuableTypes, rcl: settings.rcl, costs: { rampart: 1, constructedWall: 1 }, repairRange: 3,
        blocksMovement: type => (OBSTACLE_OBJECT_TYPES as readonly string[]).includes(type),
        operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
          minimumTowerPower: settings.minimumTowerPower,
          tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } },
      });
      return { strategies: createStoredDefenseStrategies(store, setup.generation, setup.fallback), input: setup.input,
        policy: { weights: { construction: 1, upkeep: settings.upkeep, repairAccess: settings.repair,
          gateAccess: 1, towerDeficit: settings.tower },
        maximumUnreachableRepair: settings.maximumUnreachableRepair, maximumBlockedGates: 0 } };
    }, { augmentations: settings.augmentations, scans: settings.scans });
    return { revision, advance(candidate, entries, checkpoint, guard) {
      const result = defense.advance(candidate, entries, checkpoint, guard);
      return result.status === 'complete'
        ? { ...result, entries: stageDefenseEconomy(entries, result.entries, settings.minimumStoredEnergy) } : result;
    } };
  } };
}
