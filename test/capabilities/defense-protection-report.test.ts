import { expect, test } from 'vitest';
import { defenseProtectionReport } from '../../src/capabilities/planning/defense-protection-report';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
function input() {
  const terrain: TerrainCell[] = Array(2500).fill('plain');
  return { terrain, entries: [{ x: 0, y: 25 }], barriers: [{ x: 25, y: 25 }],
    assets: [{ id: 'core', position: { x: 25, y: 25 } }, { id: 'remote', position: { x: 10, y: 10 } }] };
}
test('uncovered infrastructure cannot disappear behind an implicit protection policy', () => {
  expect(defenseProtectionReport(input(), [])).toEqual({ protectedAssets: ['core'],
    uncovered: ['remote'], intentionallyUnprotected: [], acceptable: false });
  expect(defenseProtectionReport(input(), [{ id: 'remote', reason: 'Remote source outside core envelope' }]))
    .toMatchObject({ uncovered: [], acceptable: true,
      intentionallyUnprotected: [{ id: 'remote', reason: 'Remote source outside core envelope', exposed: true }] });
});
test('exemptions retain their reason when assets happen to be protected and reject invalid decisions', () => {
  expect(defenseProtectionReport(input(), [{ id: 'core', reason: 'Optional coverage' }]).intentionallyUnprotected)
    .toEqual([{ id: 'core', reason: 'Optional coverage', exposed: false }]);
  for (const exemptions of [[{ id: 'missing', reason: 'unknown' }], [{ id: 'remote', reason: ' ' }],
    [{ id: 'remote', reason: 'one' }, { id: 'remote', reason: 'two' }]]) {
    expect(() => defenseProtectionReport(input(), exemptions)).toThrow('exemption');
  }
});
