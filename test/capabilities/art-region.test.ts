import { expect, test } from 'vitest';
import { parseArtRegion } from '../../src/features/operator/art-region';
import { excludeBarrierRepairs } from '../../src/capabilities/work/repair-exclusion';
const marker = (name: string, x: number, y: number, room = 'W0N1') => ({ name, position: { room, x, y } });
test('legacy Art corners validate rather than guessing ambiguous or incomplete input', () => {
  const bl = marker('ArtBL', 10, 20), tr = marker('ArtTR', 20, 10);
  expect(parseArtRegion('W0N1', [])).toEqual({ status: 'absent' });
  expect(parseArtRegion('W0N1', [bl, tr])).toMatchObject({ status: 'valid' });
  for (const markers of [[bl], [tr], [bl, tr, marker('OtherArtBL', 1, 2)], [marker('ArtBLTR', 10, 10)],
    [marker('ArtBL', 30, 20), tr], [bl, marker('ArtTR', 20, 30)], [bl, marker('ArtTR', NaN, 10)]]) {
    expect(parseArtRegion('W0N1', markers).status).toBe('invalid');
  }
  expect(parseArtRegion('W0N1', [marker('ArtBL', 1, 2, 'E0N1')]).status).toBe('absent');
});
test('inclusive region excludes both barrier types while retaining other work and prior exclusions', () => {
  const structure = (id: string, type: string, x: number, y: number) =>
    ({ id, type, position: { room: 'W0N1', x, y }, hits: 1, maximum: 1000, eligible: true, excluded: false });
  const view = { sites: [], structures: [structure('wall', 'constructedWall', 10, 20), structure('rampart', 'rampart', 20, 10),
    structure('outside', 'constructedWall', 21, 10), structure('road', 'road', 15, 15)] };
  const region = { room: 'W0N1', left: 10, right: 20, top: 10, bottom: 20 };
  expect(excludeBarrierRepairs(view, region).structures.map(item => item.excluded)).toEqual([true, true, false, false]);
  expect(excludeBarrierRepairs(view, 'all').structures.map(item => item.excluded)).toEqual([true, true, true, false]);
  expect(excludeBarrierRepairs(view, undefined)).toBe(view);
  expect(excludeBarrierRepairs(view, region, ['constructedWall']).structures.map(item => item.excluded))
    .toEqual([true, false, false, false]);
  expect(excludeBarrierRepairs(view, 'all', ['constructedWall']).structures.map(item => item.excluded))
    .toEqual([true, false, true, false]);
});
