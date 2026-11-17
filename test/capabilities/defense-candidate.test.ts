import { expect, test } from 'vitest';
import { evaluateDefenseCandidate } from '../../src/capabilities/planning/defense-candidate';
import { planningObservation } from '../fixtures/planning-observation';
function input() {
  return { observation: planningObservation(),
    placements: [{ type: 'storage', position: { x: 25, y: 25 } }, { type: 'tower', position: { x: 24, y: 25 } }],
    protectedAssets: [{ type: 'storage', position: { x: 25, y: 25 } }],
    barriers: [{ type: 'rampart', position: { x: 25, y: 25 } }],
    costs: { rampart: 1, constructedWall: 1 }, origins: [{ x: 23, y: 25 }],
    gates: [{ x: 25, y: 25 }], repairRange: 3,
    blocksMovement: (type: string) => type !== 'rampart' && type !== 'road',
    operations: { rampartDecayHits: 300, rampartDecayTicks: 100, repairEnergyPerHit: 0.01,
      minimumTowerPower: 500, tower: { power: 600, optimalRange: 5, falloffRange: 20, falloff: 0.75 } } };
}
test('candidate evaluation combines legal separation, repair reach and blocked gate diagnostics', () => {
  const request = input(), before = JSON.stringify(request);
  const result = evaluateDefenseCandidate(request);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('Expected candidate');
  expect(result.operations.unreachableRepair).toEqual([]);
  expect(result.operations.blockedGates).toEqual([{ x: 25, y: 25 }]);
  expect(result.operations.undercovered).toEqual([]);
  expect(result.operations.upkeepEnergyPerTick).toBe(0.03);
  expect(JSON.stringify(request)).toBe(before);
});
test('illegal sharing and exposed assets fail before operational scoring', () => {
  const request = input();
  expect(evaluateDefenseCandidate({ ...request, barriers: [] })).toMatchObject({ ok: false, phase: 'separation' });
  expect(evaluateDefenseCandidate({ ...request, barriers: [{ type: 'constructedWall', position: { x: 25, y: 25 } }] }))
    .toMatchObject({ ok: false, phase: 'placement' });
});

test('declared infrastructure inventory requires explicit exemptions for exposed assets', () => {
  const request = input();
  const protection = { assets: [{ id: 'remote', position: { x: 10, y: 20 } }], exemptions: [] };
  expect(evaluateDefenseCandidate({ ...request, protection }))
    .toMatchObject({ ok: false, phase: 'protection', details: { uncovered: ['remote'] } });
  expect(evaluateDefenseCandidate({ ...request, protection: { ...protection,
    exemptions: [{ id: 'remote', reason: 'Remote mining infrastructure' }] } }))
    .toMatchObject({ ok: true, protection: { acceptable: true,
      intentionallyUnprotected: [{ id: 'remote', exposed: true }] } });
});
