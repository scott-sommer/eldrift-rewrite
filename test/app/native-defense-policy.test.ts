import { afterEach, expect, test, vi } from 'vitest';
import { nativeDefensePolicy } from '../../src/app/native-defense-policy';
import { resolveConfig } from '../../src/config/resolve';
import type { TerrainCell } from '../../src/capabilities/planning/terrain';
import type { Envelope } from '../../src/persistence/versioned-state';
afterEach(() => vi.unstubAllGlobals());
test('native policy composes stored strategies and converges with configured barrier staging', () => {
  vi.stubGlobal('OBSTACLE_OBJECT_TYPES', ['storage', 'spawn']);
  const config = resolveConfig({ roomOverride: { planningDefenseRcl: 7, planningDefenseScans: 100000 } }, 1).values;
  const policy = nativeDefensePolicy('W0N1', config, ['storage']);
  const terrain: TerrainCell[] = Array.from({ length: 2500 }, (_, index) =>
    Math.floor(index / 50) === 25 && index % 50 <= 30 ? 'plain' : 'wall');
  const records: Record<string, Envelope> = {};
  const defense = policy.prepare({ read: key => records[key], write: (key, value) => { records[key] = value; } },
    { terrain, objects: [], infrastructure: [], constraints: [] });
  const candidate = { id: 'custom', strategy: 'custom', anchor: { x: 25, y: 25 }, transform: 0 as const };
  const entries = [{ type: 'storage', position: { x: 25, y: 25 }, rcl: 4 }];
  let result = defense.advance(candidate, entries, null, () => true);
  for (let call = 0; result.status === 'pending' && call < 100; call++) {
    result = defense.advance(candidate, entries, JSON.parse(JSON.stringify(result.checkpoint)), () => true);
  }
  expect(result.status).toBe('complete');
  if (result.status !== 'complete') throw new Error('Expected defended plan');
  expect(result.entries.filter(entry => entry.type === 'rampart')).toHaveLength(1);
  expect(result.entries.find(entry => entry.type === 'rampart')?.rcl).toBe(7);
  expect(result.entries.find(entry => entry.type === 'rampart')?.minimumStoredEnergy).toBe(50000);
  expect(Object.keys(records)).toEqual(['defense-search/W0N1']);
  expect(nativeDefensePolicy('W0N1', { ...config, planningDefenseTowerWeight: 2 }, ['storage']).revision).not.toBe(policy.revision);
});
test('defense configuration rejects unsupported profiles, invalid staging and unsafe budgets', () => {
  for (const patch of [{ planningDefenseStrategy: 'unknown' }, { planningDefenseRcl: 1 },
    { planningDefenseScans: 0 }, { planningDefenseUpkeepWeight: -1 }]) {
    expect(() => resolveConfig({ roomOverride: patch }, 1)).toThrow();
  }
  expect(resolveConfig({}, 1).values.planningDefenseStrategy).toBe('adaptive');
});
