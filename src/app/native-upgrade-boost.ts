import type { StatePort } from '../persistence/versioned-state';
import type { LabBoostRole } from '../config/lab-boost-roles';
import { legacyBoostPreferences } from '../features/industry/boosts/legacy-preferences';
import { boostLabRoles, boostRoleAllows } from '../features/industry/boost-labs/store';
import { reservedBoostLabs } from '../features/industry/boosts/store';
import type { createUpgradeBoost } from '../features/work/upgrade-boost';
import type { createNativeStructureActions } from '../adapters/screeps/structure-actions';
import { labStockBusy } from './native-boost-facts';
const upgradeCompound = (resource: string | null | undefined) => !!resource && legacyBoostPreferences.upgrade!.compounds.includes(resource);
export function boostedUpgradeWork(creep: Pick<Creep,'body'>): number {
  return creep.body.filter(part => part.type === 'work' && upgradeCompound(part.boost)).length;
}
/** Rotation keeps its legacy optional semantics but cannot consume another owner's lab/kit. */
export function issueUpgradeBoost(state: StatePort,boosts: ReturnType<typeof createUpgradeBoost>,actions: Pick<ReturnType<typeof createNativeStructureActions>,'boost'>,
  lab: StructureLab,creep: Creep,owner: string,roles: readonly LabBoostRole[]): void {
  if (reservedBoostLabs(state,lab.room.name).includes(lab.id) || labStockBusy(state,lab)) return;
  if (lab.mineralType && !boostRoleAllows(boostLabRoles(state,lab.room.name),roles,lab.id,lab.mineralType)) return;
  boosts.issue(Game.time,{ id: creep.id,boosted: boostedUpgradeWork(creep) },() => upgradeCompound(lab.mineralType) ? actions.boost(lab,creep,owner) : ERR_NOT_ENOUGH_RESOURCES);
}
