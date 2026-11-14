import { expect, test } from 'vitest';
import { mobilityCosts } from '../../src/capabilities/movement/mobility';
import type { MobilityPart } from '../../src/capabilities/movement/mobility';
const move: MobilityPart = { kind: 'move', active: true, movePower: 1, carryCapacity: 0 };
const carry: MobilityPart = { kind: 'carry', active: true, movePower: 0, carryCapacity: 50 };
const work: MobilityPart = { kind: 'other', active: true, movePower: 0, carryCapacity: 0 };
test('carried load changes terrain costs while empty CARRY parts add no weight', () => {
  expect(mobilityCosts([move, carry, carry], 0)).toMatchObject({ mobile: true, weight: 0, plainCost: 1, swampCost: 1 });
  expect(mobilityCosts([move, carry, carry], 51)).toMatchObject({ weight: 2, roadCost: 1, plainCost: 2, swampCost: 10 });
});
test('damaged MOVE cannot recover fatigue but damaged fixed body parts still weigh', () => {
  expect(mobilityCosts([{ ...move, active: false }, work], 0)).toEqual({ mobile: false });
  expect(mobilityCosts([move, { ...work, active: false }], 0)).toMatchObject({ weight: 1, recovery: 2, swampCost: 5 });
  expect(mobilityCosts([move, { ...move, active: false }, work, work], 0)).toMatchObject({ recovery: 2, plainCost: 2 });
});
test('MOVE boosts and reverse-order boosted CARRY loading match engine weighting', () => {
  const boostedCarry = { ...carry, carryCapacity: 200 };
  expect(mobilityCosts([move, carry, boostedCarry], 150)).toMatchObject({ weight: 1 });
  expect(mobilityCosts([move, boostedCarry, carry], 150)).toMatchObject({ weight: 2 });
  expect(mobilityCosts([{ ...move, movePower: 4 }, work, work], 0)).toMatchObject({ recovery: 8, plainCost: 1, swampCost: 3 });
});
