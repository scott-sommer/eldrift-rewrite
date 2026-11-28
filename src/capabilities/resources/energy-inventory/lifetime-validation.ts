import { tileKey } from '../../movement/traffic/model';
import { withinRange } from '../../movement/path-model';
import type { EnergyEcology,EnergyInventory,EnergyBody,EnergyTombstone,EnergyBodyPosition } from './model';
export function validateEnergyLifetimes(ecology: EnergyEcology,stores: readonly EnergyInventory[]): void {
  const bodies = ecology.bodies ?? [],tombs = ecology.tombstones ?? [];
  validateIdentities(ecology,stores);
  for (const body of bodies) validateBody(body,tombs,stores);
  for (const tomb of tombs) validateTombstone(tomb,bodies);
}
function validateIdentities(ecology: EnergyEcology,stores: readonly EnergyInventory[]): void {
  const bodies = ecology.bodies ?? [],tombs = ecology.tombstones ?? [];
  validateRoster(bodies,tombs); validateCollisions(ecology,stores,bodies,tombs);
}
function validateRoster(bodies: readonly EnergyBody[],tombs: readonly EnergyTombstone[]): void {
  const names = [...bodies.map(body => body.tombstoneId),...bodies.map(body => body.id)];
  if (bodies.length > 128 || tombs.length > 128 || new Set(names).size !== names.length || new Set(tombs.map(tomb => tomb.id)).size !== tombs.length) throw new Error('Invalid body/tombstone identities');
}
function validateCollisions(ecology: EnergyEcology,stores: readonly EnergyInventory[],bodies: readonly EnergyBody[],tombs: readonly EnergyTombstone[]): void {
  const natural = [...ecology.sources.map(source => source.id),...ecology.containers.map(container => container.id),...(ecology.sites ?? []).map(site => site.id)];
  const ids = [...stores.map(store => store.id),...natural];
  if (bodies.some(body => natural.includes(body.id))) throw new Error('Body identity collision');
  if (bodies.some(body => ids.includes(body.tombstoneId)) || tombs.some(tomb => ids.includes(tomb.id))) throw new Error('Tombstone identity collision');
}
function validateBody(body: EnergyBody,tombs: readonly EnergyTombstone[],stores: readonly EnergyInventory[]): void {
  tileKey(body.position); validateBodyProfile(body);
  const store = stores.find(store => store.id === body.id),tomb = tombs.find(tomb => tomb.body === body.id);
  if (body.diedAt === undefined) {
    if (!store || tomb) throw new Error('Invalid live expiry body');
  } else if (body.diedAt !== body.expiresAt || store || !tomb || tomb.id !== body.tombstoneId) throw new Error('Invalid expired body');
}
function validateBodyProfile(body: EnergyBody): void {
  if (!body.id || !body.tombstoneId || !clock(body.expiresAt) || body.expiresAt < 1 || !quantity(body.salvageEnergy) || !quantity(body.tombstoneDecay) || body.tombstoneDecay < 1 || !clock(body.expiresAt+body.tombstoneDecay)) throw new Error('Invalid natural body expiry');
}
function validateTombstone(tomb: EnergyTombstone,bodies: readonly EnergyBody[]): void {
  tileKey(tomb.position); validateTombstoneBinding(tomb,bodies);
  if (!quantity(tomb.energy) || !quantity(tomb.remaining)) throw new Error('Invalid tombstone stock/clock');
  validateTombstonePhase(tomb);
}
function validateTombstoneBinding(tomb: EnergyTombstone,bodies: readonly EnergyBody[]): void {
  const body = bodies.find(body => body.id === tomb.body);
  if (!body || body.diedAt !== tomb.createdAt || tomb.id !== body.tombstoneId || !withinRange(body.position,tomb.position,0)) throw new Error('Invalid tombstone binding');
}
function validateTombstonePhase(tomb: EnergyTombstone): void {
  if (tomb.expiredAt === undefined) {
    if (tomb.releasedEnergy !== undefined) throw new Error('Live tombstone has a release');
  } else if (!clock(tomb.expiredAt) || tomb.remaining !== 0 || tomb.energy !== 0 || !quantity(tomb.releasedEnergy!)) throw new Error('Invalid expired tombstone');
}
export function validateEnergyLifetimeClocks(ecology: EnergyEcology,nextTick: number): void {
  for (const body of ecology.bodies ?? []) {
    validateBodyClock(body,nextTick);
  }
  for (const tomb of ecology.tombstones ?? []) validateTombstoneClock(tomb,ecology.bodies!,nextTick);
}
function validateBodyClock(body: EnergyBody,nextTick: number): void {
  if (body.diedAt === undefined && nextTick >= body.expiresAt) throw new Error('Unprocessed body expiry');
  if (body.diedAt !== undefined && body.diedAt > nextTick) throw new Error('Future body expiry');
}
function validateTombstoneClock(tomb: EnergyTombstone,bodies: readonly EnergyBody[],nextTick: number): void {
  const body = bodies.find(body => body.id === tomb.body)!;
  const expiration = tomb.createdAt+Math.max(1,body.tombstoneDecay-1);
  if (tomb.expiredAt !== undefined) {
    if (tomb.expiredAt !== expiration || tomb.expiredAt > nextTick) throw new Error('Invalid tombstone expiry clock');
  } else if (nextTick >= expiration || tomb.remaining !== Math.max(0,tomb.createdAt+body.tombstoneDecay-1-nextTick)) throw new Error('Invalid tombstone countdown');
}
export function positionEnergyBodies(ecology: EnergyEcology,positions?: readonly EnergyBodyPosition[]): void {
  const live = (ecology.bodies ?? []).filter(body => body.diedAt === undefined);
  if (!positions && live.length === 0) return;
  if (!positions || positions.length !== live.length || new Set(positions.map(value => value.id)).size !== positions.length) throw new Error('Explicit final body positions required');
  for (const value of positions) {
    tileKey(value.position); const body = live.find(body => body.id === value.id); if (!body) throw new Error('Unknown final body position'); body.position = { ...value.position };
  }
}
function quantity(value: number): boolean { return Number.isSafeInteger(value) && value >= 0 && value <= 1000000000; }
function clock(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
