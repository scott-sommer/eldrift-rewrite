import { unitRosterSchema } from '../../../../../persistence/units/schema';
import type { UnitRoster } from '../../../../../persistence/units/schema';
import { framedIdentity } from '../../../../../core/framed-identity';
import type { EnergyBody,EnergyEcology } from '../../../../../capabilities/resources/energy-inventory/model';
import type { HomeHaulingInput } from './model';
/** Bind actual SDK expiry material profiles to original physical identity and observed life clock. */
export function bindHomeLifetimes(home: HomeHaulingInput): HomeHaulingInput {
  const bodies = home.bodies.flatMap(body => {
    if (!body.expiry) return [];
    const worker = home.workers.find(worker => worker.name === body.name);
    if (!worker) throw new Error('Missing home expiry body');
    if (worker.spawning) return [];
    if (worker.ticksToLive === null || worker.ticksToLive < 1) throw new Error('Missing home expiry clock');
    return [{ id: body.unit,position: worker.position,expiresAt: home.observedAt+worker.ticksToLive,...body.expiry,tombstoneId: 'forecast:'+framedIdentity(['expiry',body.unit]) }];
  });
  if (!bodies.length && !home.ecology?.bodies?.length) return home;
  if (!home.ecology || !home.control?.units) throw new Error('Missing home lifetime ecology/control');
  validateCapturedRoster(home,home.control.units);
  if (home.ecology.bodies && JSON.stringify(home.ecology.bodies) !== JSON.stringify(bodies)) throw new Error('Home lifetime declaration mismatch');
  home.ecology.bodies = bodies;
  return home;
}
function validateCapturedRoster(home: HomeHaulingInput,roster: UnitRoster): void {
  if (roster.units.length > 512 || !unitRosterSchema.valid(roster)) throw new Error('Invalid captured lifecycle roster');
  for (const body of home.bodies) {
    if (!roster.units.some(unit => unit.name === body.name && unit.id === body.unit)) throw new Error('Captured lifecycle roster loses a body');
  }
}
export function deadHomeBodies(ecology?: EnergyEcology): ReadonlySet<string> {
  return new Set(ecology?.bodies?.filter(body => body.diedAt !== undefined).map(body => body.id) ?? []);
}
export function validateHomeLifetimeMetadata(opening: EnergyEcology,current: EnergyEcology): void {
  const original = opening.bodies ?? [],restored = current.bodies ?? [];
  if (original.length !== restored.length) throw new Error('Home lifetime roster mismatch');
  for (const body of restored) {
    const previous = original.find(value => value.id === body.id);
    if (!previous || JSON.stringify(metadata(previous)) !== JSON.stringify(metadata(body))) throw new Error('Home lifetime metadata mismatch');
  }
}
function metadata(body: EnergyBody) {
  return { id: body.id,expiresAt: body.expiresAt,salvageEnergy: body.salvageEnergy,tombstoneId: body.tombstoneId,tombstoneDecay: body.tombstoneDecay };
}
