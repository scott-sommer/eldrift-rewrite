import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';

test('scout activation, mission rooms and policy are configurable with detached arrays', () => {
  const rooms = ['W1N1'];
  const config = resolveConfig({ roomOverride: { scoutsEnabled: true, scoutAssignedRooms: rooms, scoutCount: 2, scoutThreatRange: 3 } },10);
  rooms.push('W2N1');
  expect(config.values.scoutAssignedRooms).toEqual(['W1N1']);
  expect(config.values.scoutSpawningEnabled).toBe(false);
  expect(config.sources.scoutsEnabled).toBe('roomOverride');
});

test.each([{ scoutAssignedRooms: ['sim'] },{ scoutCount: 21 },{ scoutDepth: 9 },{ scoutStuckTicks: 0 },
  { scoutPlanCpuBudget: Infinity },{ scoutExtendedProgress: 1.1 },{ scoutThreatRange: -1 }])('invalid scout settings reject: %j', patch => {
  expect(() => resolveConfig({ empire: patch },10)).toThrow('invalid');
});
