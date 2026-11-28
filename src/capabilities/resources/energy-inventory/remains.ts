import { withinRange } from '../../movement/path-model';
import { addGroundEnergy } from './ground';
import type { EnergyEcology,EnergyInventory } from './model';
/** Creep/tombstone object ticks run after actor effects in the explicitly supplied native object order. */
export function expireBody(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,id: string,tick: number): void {
  const body = ecology.bodies!.find(body => body.id === id)!;
  if (tick < body.expiresAt-1) return;
  const unit = stores.get(id)!;
  if (unit.energy !== unit.usedCapacity) throw new Error('Mixed expiry cargo requires a physical resource model');
  const material = unit.energy+body.salvageEnergy;
  const energy = material-captureContainer(stores,ecology,body.position,material);
  stores.delete(id); body.diedAt = tick+1;
  (ecology.tombstones ??= []).push({ id: body.tombstoneId,body: id,position: { ...body.position },energy,remaining: body.tombstoneDecay-1,createdAt: tick+1 });
}
export function decayTombstone(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,id: string,tick: number): void {
  const tombstone = ecology.tombstones!.find(tombstone => tombstone.id === id)!;
  tombstone.remaining = Math.max(0,tombstone.remaining-1);
  if (tombstone.remaining > 0) return;
  const energy = tombstone.energy;
  const dropped = energy-captureContainer(stores,ecology,tombstone.position,energy);
  addGroundEnergy(ecology,tombstone.position,dropped);
  tombstone.energy = 0; tombstone.expiredAt = tick+1; tombstone.releasedEnergy = energy;
}
function captureContainer(stores: Map<string,EnergyInventory>,ecology: EnergyEcology,position: { room: string; x: number; y: number },energy: number): number {
  const container = ecology.containers.find(container => container.destroyedAt === undefined && withinRange(container.position,position,0));
  const store = container && stores.get(container.id); if (!store) return 0;
  const captured = Math.min(energy,store.freeEnergyCapacity);
  store.energy += captured; store.usedCapacity += captured; store.freeEnergyCapacity -= captured;
  return captured;
}
