import { createNativePlanningScore } from './native-planning-score';
import type { NativePlanningPolicy } from './native-planning-work';
import type { RuntimeConfig } from '../config/model';
import { applyLegacyPerimeterDefense } from '../features/planning/legacy-perimeter-defense';
const protectedTypes = ['spawn', 'extension', 'storage', 'terminal', 'lab', 'tower', 'factory', 'powerSpawn', 'nuker', 'observer'];
/** Initial tunable policy; final cost balancing and economy-aware defenses require qualification. */
export function nativePlanningPolicy(room: string, config: Readonly<RuntimeConfig>): NativePlanningPolicy {
  const barrierCosts = { rampart: 1, constructedWall: 1 };
  const score = createNativePlanningScore(room, {
    maximumPathOps: config.planningMaximumPathOps, protectedTypes, barrierCosts,
  });
  return { config, implementationRevision: 'native-planning-v2:legacy-perimeter-v1',
    versions: { standard: 'standard-v1', constrained: 'constrained-v1', stamps: 'stamps-v1' }, searchRevision: 'native-roads-v1',
    scoreRevision: score.revision, maximumPathOps: config.planningMaximumPathOps,
    valuableTypes: protectedTypes, protectedTypes, barrierCosts, constraints: [],
    minimumImprovement: config.planningMinimumImprovement,
    weights: { hauling: config.planningHaulingWeight, service: config.planningServiceWeight,
      capacityShortfall: config.planningCapacityWeight, swamps: config.planningSwampWeight,
      defense: config.planningDefenseWeight, migration: config.planningMigrationWeight },
    prepareScore(observation) {
      const prepare = score.prepare(observation);
      return (candidate, entries) => prepare(candidate, applyLegacyPerimeterDefense(candidate, entries, observation));
    },
  };
}
