import type { HomeHaulingInput } from '../../src/app/remotes/startup/hauling-state/world/model';
/** Explicit ordinary small-body scenario facts; no implicit lifetime opt-in in production. */
export function enableHomeExpiry(input: HomeHaulingInput): void {
  input.ecology ??= { sources: [],ground: [],containers: [],decayDivisor: 1000 };
  input.control ??= { assignments: null,reservations: null };
  input.control.units = { units: input.bodies.map(body => ({ name: body.name,id: body.unit })) };
  for (const body of input.bodies) {
    const worker = input.workers.find(worker => worker.name === body.name)!;
    body.expiry = { salvageEnergy: 0,tombstoneDecay: worker.body.length*5 };
  }
}
