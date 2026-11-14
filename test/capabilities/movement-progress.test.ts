import { expect, test } from 'vitest';
import { createMovementProgress } from '../../src/capabilities/movement/progress';
import { createNavigator } from '../../src/capabilities/movement/navigator';
import { createPathService } from '../../src/capabilities/movement/path-service';
const position = { room: 'W0N0', x: 20, y: 20 };
test('only consecutive accepted moves without observed progress count as blockage', () => {
  const progress = createMovementProgress();
  expect(progress.observe('unit-id', position, 1, true)).toBe(0);
  progress.issued('unit-id', 1);
  expect(progress.observe('unit-id', position, 2, true)).toBe(1);
  expect(progress.observe('unit-id', position, 2, true)).toBe(1);
  progress.issued('unit-id', 2);
  expect(progress.observe('unit-id', position, 3, false)).toBe(0);
  expect(progress.observe('unit-id', position, 4, true)).toBe(0);
  progress.issued('unit-id', 4);
  expect(progress.observe('unit-id', { ...position, room: 'E0N0' }, 5, true)).toBe(0);
  progress.issued('unit-id', 5);
  expect(progress.observe('unit-id', position, 8, true)).toBe(0);
  expect(createMovementProgress().observe('unit-id', position, 9, true)).toBe(0);
});
test('repeated blockage requests an occupancy-aware replan and resets after progress', () => {
  let tick = 1;
  let searches = 0;
  const avoidance: boolean[] = [];
  const paths = createPathService(() => { searches++; return { status: 'complete', path: [{ ...position, x: 21 }], cost: 1, operations: 1 }; }, () => tick);
  const navigate = createNavigator({ paths,
    request: (view, avoidUnits, unit) => {
      expect(unit).toBe('unit-id');
      avoidance.push(avoidUnits);
      return { origin: view.position, destination: view.destination, range: 0,
        profile: { id: 'test', plainCost: 1, swampCost: 5, maxOps: 100, maxRooms: 1 }, topologyVersion: String(avoidUnits), policyVersion: 'one' };
    }, direction: () => 3, move: () => ({ status: 'issued', code: 0 }), rejected: () => ({ status: 'failed', reason: 'rejected' }),
  });
  const view = { tick, position, destination: { ...position, x: 22 }, range: 0, fatigue: 0, allowPartial: false };
  for (tick = 1; tick <= 3; tick++) expect(navigate('unit-id', { ...view, tick }).status).toBe('running');
  expect(avoidance).toEqual([false, false, true]);
  expect(searches).toBe(2);
  expect(navigate('unit-id', { ...view, tick: 4, position: view.destination })).toEqual({ status: 'done' });
  expect(navigate('damaged', { ...view, tick: 4 }, false)).toEqual({ status: 'failed', reason: 'no-active-move' });
  expect(navigate('arrived-damaged', { ...view, tick: 4, position: view.destination }, false)).toEqual({ status: 'done' });
  expect(avoidance).toHaveLength(3);
});

