import type { EnergyContainer,EnergyEcology,EnergyInventory } from './model';
import { addGroundEnergy } from './ground';
export function validateContainerLifecycle(container: EnergyContainer,ecology: EnergyEcology,stores: readonly EnergyInventory[]): void {
  const health = ecology.structures?.find(target => target.id === container.id);
  if (container.decay !== undefined) validateDecay(container);
  if (container.decay !== undefined && !health) throw new Error('Missing container health');
  if (container.destroyedAt === undefined) {
    if (container.spilledEnergy !== undefined) throw new Error('Live container has a destruction spill');
    if (!stores.some(store => store.id === container.id)) throw new Error('Missing physical overflow container store');
  } else validateDestroyed(container,health?.hits,stores);
}
function validateDecay(container: EnergyContainer): void {
  const decay = container.decay!;
  if (![decay.remaining,decay.interval,decay.amount].every(quantity) || decay.interval < 1 || decay.amount < 1) throw new Error('Invalid container decay clock');
  if ((decay.remaining === 0) !== (container.destroyedAt !== undefined)) throw new Error('Inconsistent container lifecycle phase');
}
function validateDestroyed(container: EnergyContainer,hits: number | undefined,stores: readonly EnergyInventory[]): void {
  if (!container.decay || (!Number.isSafeInteger(container.destroyedAt) || container.destroyedAt! < 0) || !quantity(container.spilledEnergy!) || hits !== 0 || stores.some(store => store.id === container.id)) throw new Error('Invalid destroyed container');
}
export function validateContainerClocks(ecology: EnergyEcology,nextTick: number): void {
  if (ecology.containers.some(container => container.destroyedAt !== undefined && container.destroyedAt > nextTick)) throw new Error('Future container destruction clock');
}
/** Object-tick phase; new piles created here are absent from the precomputed object iteration. */
export function decayContainer(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,id: string,tick: number): void {
  const container = ecology.containers.find(container => container.id === id)!,decay = container.decay!;
  if (--decay.remaining > 0) return;
  const health = ecology.structures!.find(target => target.id === id)!;
  health.hits = Math.max(0,health.hits-decay.amount);
  if (health.hits > 0) { decay.remaining = decay.interval; return; }
  const store = stores.get(id)!;
  container.destroyedAt = tick+1; container.spilledEnergy = store.energy;
  stores.delete(id); addGroundEnergy(ecology,container.position,store.energy);
}
function quantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000000; }
