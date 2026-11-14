export interface MobilityPart {
  kind: 'move' | 'carry' | 'other';
  active: boolean;
  movePower: number;
  carryCapacity: number;
}
export type Mobility = { mobile: false } | {
  mobile: true; weight: number; recovery: number; roadCost: number; plainCost: number; swampCost: number;
};
function loadedWeight(body: readonly MobilityPart[], load: number): number {
  let weight = 0;
  for (let index = body.length - 1; index >= 0 && load > 0; index--) {
    const part = body[index]!;
    if (part.kind !== 'carry' || !part.active) continue;
    load -= Math.min(load, part.carryCapacity);
    weight++;
  }
  return weight;
}
function validate(body: readonly MobilityPart[], load: number): void {
  if (!Number.isFinite(load) || load < 0) throw new Error('Invalid carried load');
  if (body.some(part => !Number.isFinite(part.movePower) || part.movePower < 0 || !Number.isFinite(part.carryCapacity) || part.carryCapacity < 0)) throw new Error('Invalid mobility body');
}
/** Steady-state terrain ticks, not current fatigue or combat-tick prediction. */
export function mobilityCosts(body: readonly MobilityPart[], load: number): Mobility {
  validate(body, load);
  const recovery = body.reduce((total, part) => total + (part.kind === 'move' && part.active ? part.movePower * 2 : 0), 0);
  if (recovery === 0) return { mobile: false };
  // Engine counts damaged non-MOVE/non-CARRY parts as weight too.
  const weight = body.filter(part => part.kind === 'other').length + loadedWeight(body, load);
  const cost = (rate: number) => Math.max(1, Math.min(254, Math.ceil(weight * rate / recovery)));
  return { mobile: true, weight, recovery, roadCost: cost(1), plainCost: cost(2), swampCost: cost(10) };
}
