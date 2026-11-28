import { expandHomeConstruction } from './construction-state';
import { destroyedHomeStores,validateHomeContainerMetadata } from './container-state';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { Journal } from '../../../../../features/logistics/transfer-journal';
import type { TransferAttempt } from '../../../../../capabilities/logistics/confirmation';
import { createTransferJournal } from '../../../../../features/logistics/transfer-journal';
import type { PaidHaulingForecastSeed,PaidHaulingForecastWorker } from '../service';
import type { EnergyEffect,EnergySource,EnergyRepairTarget } from '../../../../../capabilities/resources/energy-inventory/model';
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
  input = expandHomeConstruction(input,checkpoint.ecology);
  validateEcologyMetadata(input.ecology,checkpoint.ecology);
  const dead = destroyedHomeStores(checkpoint.ecology);
  const original = [...input.inventories,...input.bodies.map(body => body.inventory)].filter(store => !dead.has(store.id));
  if (original.length !== checkpoint.stores.length) throw new Error('Home checkpoint inventory roster mismatch');
  for (const store of checkpoint.stores) {
    const opening = original.find(value => value.id === store.id);
    if (!opening || ['capacityPool','room','capacity','active'].some(key => opening[key as keyof PaidHomeInventory] !== store[key as keyof PaidHomeInventory])) throw new Error('Home checkpoint inventory metadata mismatch');
  }
  return createEnergyInventoryFrame(checkpoint.nextTick,checkpoint.stores,checkpoint.effects,checkpoint.ecology);
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
function validatePendingContinuation(effects: readonly EnergyEffect[],seed: PaidHaulingForecastSeed,worker: PaidHaulingForecastWorker): void {
  const journal = createTransferJournal(seed.state,worker.unit).peek();
  const own = effects.filter(effect => (effect.kind === 'transfer' || effect.kind === 'withdraw') && (effect.kind === 'withdraw' ? effect.target : effect.source) === worker.unit);
  validateEffectJournals(own,journal);
  if (!journal?.attempt || journal.acknowledged || journal.result !== null) return;
  validatePendingEffect(effects,journal.attempt,worker.unit);
}
function validateEffectJournals(effects: readonly EnergyEffect[],journal: Journal | undefined): void {
  if (effects.some(effect => journal?.attempt?.id !== effect.id || journal.acknowledged)) throw new Error('Missing home checkpoint pending journal');
}
function validatePendingEffect(effects: readonly EnergyEffect[],attempt: TransferAttempt,unit: string): void {
  const effect = effects.find(effect => effect.id === attempt.id);
  if (!effect || effect.kind !== attempt.kind || effect.issuedAt !== attempt.tick) throw new Error('Missing home checkpoint pending effect');
  const source = attempt.kind === 'withdraw' ? attempt.target : unit;
  const target = attempt.kind === 'withdraw' ? unit : attempt.target;
  if (effect.source !== source || effect.target !== target || effect.amount > attempt.amount) throw new Error('Home checkpoint effect binding mismatch');
}

function validateEcologyMetadata(opening: HomeHaulingInput['ecology'],current: HomeHaulingInput['ecology']): void {
  if (!opening && !current) return;
  if (!opening || !current) throw new Error('Home checkpoint ecology presence mismatch');
  if (opening.sources.length !== current.sources.length) throw new Error('Home checkpoint source roster mismatch');
  validateSourceMetadata(opening.sources,current.sources);
  validateHealthMetadata(opening,current);
  validateHomeContainerMetadata(opening.containers,current.containers);
  if (current.decayDivisor !== opening.decayDivisor) throw new Error('Home checkpoint ecology rules mismatch');
}

function validateSourceMetadata(original: readonly EnergySource[],restored: readonly EnergySource[]): void {
  for (const source of restored) {
    const initial = original.find(value => value.id === source.id);
    if (!initial || !withinRange(initial.position,source.position,0) || initial.capacity !== source.capacity || initial.regenerationTicks !== source.regenerationTicks) throw new Error('Home checkpoint source metadata mismatch');
  }
}

function validateStructureMetadata(opening: readonly EnergyRepairTarget[],current: readonly EnergyRepairTarget[]): void {
  if (opening.length !== current.length) throw new Error('Home checkpoint repair target roster mismatch');
  for (const target of current) {
    const original = opening.find(value => value.id === target.id);
    if (!original || original.hitsMax !== target.hitsMax || original.repairable !== target.repairable || !withinRange(original.position,target.position,0)) throw new Error('Home checkpoint repair target metadata mismatch');
  }
}

function validateHealthMetadata(opening: NonNullable<HomeHaulingInput['ecology']>,current: NonNullable<HomeHaulingInput['ecology']>): void {
  validateStructureMetadata(opening.structures ?? [],current.structures ?? []);
}
