import { energyNatural } from './validation';
export interface StartupRegenerationSpawn { id: string; energy: number; eligible: boolean }
export interface StartupRegenerationFrame {
  /** Pinned engine scope snapshot after all room intents, before per-object tick processing. */
  roomEnergy: number;
  /** Eligibility includes controller ownership/level, allowed spawn count and tutorial rules. */
  spawns: readonly StartupRegenerationSpawn[];
}
export const startupRegenerationPolicy = 'native-spawn-passive-v1';
/** Native ambient input, never household delivery. Caller owns its physical and cash settlement. */
export function quoteStartupSpawnRegeneration(frame: StartupRegenerationFrame) {
  validateFrame(frame);
  const credits = frame.roomEnergy < 300 ? frame.spawns.filter(spawn => spawn.eligible && spawn.energy < 300).map(spawn => ({ structure: spawn.id,energy: 1 })) : [];
  return { policy: startupRegenerationPolicy,energy: credits.length,credits };
}
function validateFrame(frame: StartupRegenerationFrame): void {
  if (!energyNatural(frame.roomEnergy) || frame.roomEnergy > 1000000000 || frame.spawns.length > 16) throw new Error('Invalid spawn regeneration frame');
  if (new Set(frame.spawns.map(spawn => spawn.id)).size !== frame.spawns.length) throw new Error('Duplicate regeneration spawn');
  frame.spawns.forEach(validateSpawn);
  const eligibleEnergy = frame.spawns.filter(spawn => spawn.eligible).reduce((sum,spawn) => sum+spawn.energy,0);
  if (eligibleEnergy > frame.roomEnergy) throw new Error('Regeneration room snapshot omits eligible stock');
}
function validateSpawn(spawn: StartupRegenerationSpawn): void {
  if (typeof spawn.id !== 'string' || !spawn.id.length || spawn.id.length > 240 || typeof spawn.eligible !== 'boolean') throw new Error('Invalid regeneration identity/eligibility');
  if (!energyNatural(spawn.energy) || spawn.energy > 300) throw new Error('Invalid regeneration spawn stock');
}
