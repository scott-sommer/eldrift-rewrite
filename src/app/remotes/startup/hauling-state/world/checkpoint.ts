import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { Journal } from '../../../../../features/logistics/transfer-journal';
import type { TransferAttempt } from '../../../../../capabilities/logistics/confirmation';
import { createTransferJournal } from '../../../../../features/logistics/transfer-journal';
import type { PaidHaulingForecastSeed,PaidHaulingForecastWorker } from '../service';
import type { EnergyTransferEffect } from '../../../../../capabilities/resources/energy-inventory/model';
import { copyPlain } from '../../../../../core/plain-data';
import type { EnergyInventoryCheckpoint } from '../../../../../capabilities/resources/energy-inventory/model';
import { createEnergyInventoryFrame } from '../../../../../capabilities/resources/energy-inventory/frame';
import type { PaidHomeInventory } from '../../home-observation/model';
import type { PrivateHaulingRecord } from '../private-state';
import type { PaidMovementCheckpoint } from '../movement/model';
import type { ForecastCourierPhysical } from '../observation';
import type { HomeHaulingInput } from './model';
export interface HomeHaulingCheckpoint {
  format: 1; input: HomeHaulingInput; policy: { minimumBatch: number; requestLifetime: number };
  inventory: EnergyInventoryCheckpoint<PaidHomeInventory>; state: PrivateHaulingRecord[];
  movement: PaidMovementCheckpoint; bodies: (ForecastCourierPhysical & { unit: string })[];
}
export function readHomeHaulingCheckpoint(raw: HomeHaulingCheckpoint): HomeHaulingCheckpoint {
  const value = copyPlain(raw);
  if (value.format !== 1 || !Number.isSafeInteger(value.inventory.nextTick) || value.inventory.nextTick < value.input.observedAt
    || value.movement.tick !== value.inventory.nextTick-1) throw new Error('Invalid home world checkpoint version/clock');
  return value;
}
/** Material metadata is immutable in this version; body pose is separately owned and restored. */
export function restoreHomeInventory(input: HomeHaulingInput,checkpoint: EnergyInventoryCheckpoint<PaidHomeInventory>) {
  const original = [...input.inventories,...input.bodies.map(body => body.inventory)];
  if (original.length !== checkpoint.stores.length) throw new Error('Home checkpoint inventory roster mismatch');
  for (const store of checkpoint.stores) {
    const opening = original.find(value => value.id === store.id);
    if (!opening || ['capacityPool','room','capacity','active'].some(key => opening[key as keyof PaidHomeInventory] !== store[key as keyof PaidHomeInventory])) throw new Error('Home checkpoint inventory metadata mismatch');
  }
  return createEnergyInventoryFrame(checkpoint.nextTick,checkpoint.stores,checkpoint.effects);
}

/** Pending private attempts must retain the effect needed by the one-frame confirmation window. */
export function validateHomeContinuation(checkpoint: HomeHaulingCheckpoint,seed: PaidHaulingForecastSeed): void {
  validateBodyContinuation(checkpoint);
  if (checkpoint.inventory.nextTick === checkpoint.input.observedAt) return;
  for (const worker of seed.workers) validatePendingContinuation(checkpoint.inventory.effects,seed,worker);
}
function validateBodyContinuation(checkpoint: HomeHaulingCheckpoint): void {
  for (const expected of checkpoint.movement.expected) {
    const body = checkpoint.bodies.find(body => body.unit === expected.unit);
    if (!body || !withinRange(body.position,expected.position,0) || body.fatigue !== expected.fatigue) throw new Error('Home checkpoint body/movement mismatch');
  }
}
function validatePendingContinuation(effects: readonly EnergyTransferEffect[],seed: PaidHaulingForecastSeed,worker: PaidHaulingForecastWorker): void {
  const journal = createTransferJournal(seed.state,worker.unit).peek();
  const own = effects.filter(effect => (effect.kind === 'withdraw' ? effect.target : effect.source) === worker.unit);
  validateEffectJournals(own,journal);
  if (!journal?.attempt || journal.acknowledged || journal.result !== null) return;
  validatePendingEffect(effects,journal.attempt,worker.unit);
}
function validateEffectJournals(effects: readonly EnergyTransferEffect[],journal: Journal | undefined): void {
  if (effects.some(effect => journal?.attempt?.id !== effect.id || journal.acknowledged)) throw new Error('Missing home checkpoint pending journal');
}
function validatePendingEffect(effects: readonly EnergyTransferEffect[],attempt: TransferAttempt,unit: string): void {
  const effect = effects.find(effect => effect.id === attempt.id);
  if (!effect || effect.kind !== attempt.kind || effect.issuedAt !== attempt.tick) throw new Error('Missing home checkpoint pending effect');
  const source = attempt.kind === 'withdraw' ? attempt.target : unit;
  const target = attempt.kind === 'withdraw' ? unit : attempt.target;
  if (effect.source !== source || effect.target !== target || effect.amount > attempt.amount) throw new Error('Home checkpoint effect binding mismatch');
}
