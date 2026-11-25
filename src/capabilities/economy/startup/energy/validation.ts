import { validateRegenerationLayout } from './regeneration-layout';
import type { StartupEnergyLayout, StartupEnergyStructure, StartupEnergyEvent } from './model';
export function energyNatural(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function identity(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 240; }
export function validateEnergyLayout(input: StartupEnergyLayout): void {
  if (!input.structures.length || input.structures.length > 128 || input.orders.length > 16) throw new Error('Invalid energy layout limits');
  unique(input.structures.map(point => point.id)); unique(input.orders.map(order => order.spawn));
  input.structures.forEach(validatePoint); validateRegenerationLayout(input);
  const points = new Map(input.structures.map(point => [point.id,point]));
  input.orders.forEach(order => {
    if (points.get(order.spawn)?.kind !== 'spawn' || !order.structures.length || order.structures.length > 128) throw new Error('Invalid energy charge origin');
    unique(order.structures); if (!order.structures.every(id => points.has(id))) throw new Error('Unknown energy structure');
  });
}
function validatePoint(point: StartupEnergyStructure): void {
  validatePointFacts(point);
  if (!point.capacity || point.capacity > 1000000 || point.energy > point.capacity) throw new Error('Invalid energy capacity');
  validateReservations(point);
}
function validatePointFacts(point: StartupEnergyStructure): void {
  const quantities = [point.energy,point.capacity,point.reservedEnergy ?? 0,point.reservedCapacity ?? 0];
  if (!['spawn','extension'].includes(point.kind) || !quantities.every(energyNatural)) throw new Error('Invalid energy structure facts');
}
function validateReservations(point: StartupEnergyStructure): void {
  const stock = point.reservedEnergy ?? 0, space = point.reservedCapacity ?? 0;
  if (stock > point.energy || space > point.capacity-point.energy) throw new Error('Invalid energy reservations');
}

function unique(values: readonly string[]): void {
  if (!values.every(identity) || new Set(values).size !== values.length) throw new Error('Duplicate/invalid energy identity');
}
export function energyLayoutIdentity(input: StartupEnergyLayout): string {
  const points = input.structures.map(point => [point.id,point.kind,point.energy,point.capacity,point.reservedEnergy ?? 0,point.reservedCapacity ?? 0]).sort((a,b) => String(a[0]).localeCompare(String(b[0])));
  const orders = input.orders.map(order => [order.spawn,[...order.structures]]).sort((a,b) => String(a[0]).localeCompare(String(b[0])));
  return JSON.stringify([points,orders,...(input.regeneration ? [[input.regeneration.otherRoomEnergy,[...input.regeneration.eligibleSpawns].sort()]] : [])]);
}
export function validateEnergyEvent(event: StartupEnergyEvent): void {
  if (!identity(event.holder) || !energyNatural(event.energy) || event.energy < 1 || !energyNatural(event.tick) || event.tick > 10000) throw new Error('Invalid energy event');
  if (!['charge','deposit','ambient'].includes(event.kind)) throw new Error('Invalid energy operation');
}
