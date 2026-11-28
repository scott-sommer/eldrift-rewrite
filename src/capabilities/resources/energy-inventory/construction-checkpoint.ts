import { boostedWorkEffect } from '../../actions/work-profile';
import type { EnergyBuildEffect,EnergyEcology } from './model';
export function validateBuildAccounting(effect: EnergyBuildEffect,ecology: EnergyEcology,tick: number): void {
  const site = ecology.sites!.find(site => site.id === effect.target)!;
  if (!Number.isSafeInteger(effect.progressAdded) || effect.progressAdded < 0 || effect.amount > effect.profile.workParts*5 || effect.progressAdded > boostedWorkEffect(effect.profile,effect.amount,site.progressTotal)) throw new Error('Invalid build effect accounting');
  validateConsistency(effect);
  validateCompletion(effect,ecology,tick);
}
function validateConsistency(effect: EnergyBuildEffect): void {
  if ((effect.amount === 0) !== (effect.progressAdded === 0) || (!effect.allowed && effect.amount !== 0) || typeof effect.completed !== 'boolean') throw new Error('Inconsistent build effect accounting');
}
function validateCompletion(effect: EnergyBuildEffect,ecology: EnergyEcology,tick: number): void {
  const site = ecology.sites!.find(site => site.id === effect.target)!;
  if (effect.completed) {
    if (site.completedAt !== tick || effect.progressAdded === 0 || effect.created !== site.completion!.store.id) throw new Error('Invalid construction completion witness');
  } else if (effect.created !== undefined) throw new Error('Uncompleted construction has a birth witness');
}
