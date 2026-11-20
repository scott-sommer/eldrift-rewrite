import { restoreContainerCheckpoint } from './checkpoints/container';
import { shouldRepairMining } from '../../mining/repair-policy';
import { energyRepairEffect } from '../../mining/repair-effect';
import type { MiningRepairPolicy } from '../../mining/repair-policy';
export interface StartupContainerInput {
  /** Facts at the first frame where construction is visible; decayIn counts remaining action frames. */
  hits: number; hitsMax: number; decayAmount: number; decayInterval: number; decayIn: number;
  repairPolicy: Readonly<MiningRepairPolicy> | null;
}
export function createStartupContainer(input: StartupContainerInput, checkpoint?: unknown) {
  validateContainer(input);
  const facts = { ...input }, policy = input.repairPolicy && { ...input.repairPolicy };
  let previousFrame: number | null = null;
  let hits = input.hits, decayIn = input.decayIn, destroyedAt: number | null = null;
  let repairedHits = 0, repairEnergy = 0, decayEvents = 0, unrecoveredEnergy = 0;
  if (checkpoint !== undefined) { ({ previousFrame,hits,decayIn,destroyedAt,repairedHits,repairEnergy,decayEvents,unrecoveredEnergy } = restoreContainerCheckpoint(input,checkpoint)); }
  return {
    checkpoint() { return { previousFrame,hits,decayIn,destroyedAt,repairedHits,repairEnergy,decayEvents,unrecoveredEnergy }; },
    alive: () => hits > 0,
    needsRepair: (energy: number, depleted: boolean) => hits > 0 && !!policy && shouldRepairMining(hits,facts.hitsMax,energy,depleted,policy),
    repair(energy: number, workParts: number): number {
      if (hits === 0) throw new Error('Cannot repair destroyed startup container');
      const effect = energyRepairEffect(workParts,hits,facts.hitsMax,energy);
      hits += effect.repairedHits; repairedHits += effect.repairedHits; repairEnergy += effect.energySpent;
      return effect.energySpent;
    },
    finish(tick: number, storedEnergy: number): boolean {
      validateFrame(tick,storedEnergy,previousFrame); previousFrame = tick;
      if (hits === 0) return false;
      decayIn--;
      if (decayIn > 0) return true;
      hits = Math.max(0,hits-facts.decayAmount); decayEvents++; decayIn = facts.decayInterval;
      if (hits === 0) { destroyedAt = tick+1; unrecoveredEnergy += storedEnergy; }
      return hits > 0;
    },
    result() { return { hits,decayIn,destroyedAt,repairedHits,repairEnergy,decayEvents,unrecoveredEnergy }; },
  };
}
function validateContainer(input: StartupContainerInput): void {
  if (![input.hits,input.hitsMax,input.decayAmount,input.decayInterval,input.decayIn].every(value => Number.isSafeInteger(value) && value > 0 && value <= 1000000000)) throw new Error('Invalid startup container facts');
  if (input.hits > input.hitsMax || input.decayIn > input.decayInterval) throw new Error('Invalid startup container phase');
  if (input.repairPolicy) shouldRepairMining(input.hits,input.hitsMax,0,false,input.repairPolicy);
}
export type StartupContainer = ReturnType<typeof createStartupContainer>;

function validateFrame(tick: number, energy: number, previous: number | null): void {
  if (!Number.isSafeInteger(tick) || tick < 0 || tick > 10000 || (previous !== null && tick !== previous+1)) throw new Error('Invalid startup container frame');
  if (!Number.isSafeInteger(energy) || energy < 0 || energy > 1000000) throw new Error('Invalid startup container stock');
}
