import { bodyPlan, repeatedBody } from '../../../capabilities/spawning/body';
export function remoteConstructionBody(budget: number) {
  return bodyPlan(repeatedBody(['work','carry','carry','move','move'],budget,50),budget);
}
export interface RemoteConstructionCandidate {
  owner: string; remainingEnergy: number; carriedEnergy: number; effective: boolean; present: boolean; bodyCost: number;
}
export interface RemoteConstructionBudget {
  storageEnergy: number; storageReserve: number; spawnEnergy: number; maximumWorkers: number; liveWorkers: number; additionalSlots: number;
}
/** Reserve each selected room's remaining unboosted work once; carried supply is already funded. */
export function allocateRemoteConstruction(candidates: readonly RemoteConstructionCandidate[], budget: RemoteConstructionBudget): string[] {
  validate(candidates,budget);
  let storage = Math.max(0,budget.storageEnergy-budget.storageReserve), spawn = budget.spawnEnergy;
  let slots = Math.min(Math.max(0,budget.maximumWorkers-budget.liveWorkers),budget.additionalSlots), selected = 0;
  const owners: string[] = [];
  const ordered = [...candidates].sort((a,b) => Number(b.present)-Number(a.present) || a.owner.localeCompare(b.owner));
  for (const candidate of ordered) {
    if (selected >= budget.maximumWorkers || candidate.remainingEnergy === 0) continue;
    const capital = Math.max(0,candidate.remainingEnergy-candidate.carriedEnergy), spawnCost = candidate.effective ? 0 : candidate.bodyCost;
    if (capital > storage || spawnCost > spawn || !candidate.effective && slots === 0) continue;
    owners.push(candidate.owner); selected++; storage -= capital; spawn -= spawnCost;
    if (!candidate.effective) slots--;
  }
  return owners;
}
function validate(candidates: readonly RemoteConstructionCandidate[], budget: RemoteConstructionBudget): void {
  if (!Object.values(budget).every(natural) || candidates.length > 128) throw new Error('Invalid construction budget');
  if (new Set(candidates.map(candidate => candidate.owner)).size !== candidates.length) throw new Error('Duplicate construction owner');
  for (const candidate of candidates) {
    if (!candidate.owner || ![candidate.remainingEnergy,candidate.carriedEnergy,candidate.bodyCost].every(natural)
      || typeof candidate.effective !== 'boolean' || typeof candidate.present !== 'boolean') throw new Error('Invalid construction candidate');
  }
}
function natural(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
