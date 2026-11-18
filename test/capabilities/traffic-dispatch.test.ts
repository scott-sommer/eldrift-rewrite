import { expect, test } from 'vitest';
import { createNavigator } from '../../src/capabilities/movement/navigator';
import { createPathService } from '../../src/capabilities/movement/path-service';
import { createTrafficDispatch } from '../../src/capabilities/movement/traffic/dispatch';
const position = { room: 'W0N0', x: 20, y: 20 };
const target = { ...position, x: 21 };
test('queued requests do not count as issued; confirmed traffic denial enables avoidance after settlement', () => {
  let tick = 1;
  let blocker = true;
  let issued = 0;
  const avoidance: boolean[] = [];
  const paths = createPathService(() => ({ status: 'complete', path: [target], cost: 1, operations: 1 }), () => tick);
  const dispatch = createTrafficDispatch({ clock: () => tick,
    observe: () => [{ unit: 'a', position }, ...(blocker ? [{ unit: 'blocker', position: target }] : [])],
    legal: () => true, issue: () => { issued++; return { status: 'issued', code: 0 }; },
  }, (unit, at, outcome) => navigate.settle(unit, at, outcome));
  const navigate = createNavigator({ paths,
    request: (view, avoid) => { avoidance.push(avoid); return { origin: view.position, destination: view.destination, range: 0,
      profile: { id: 'test', plainCost: 1, swampCost: 5, maxOps: 100, maxRooms: 1 }, topologyVersion: String(avoid), policyVersion: 'safe' }; },
    direction: () => 3,
    move: unit => dispatch.submit({ unit, owner: 'task', from: position, to: target, priority: 0, mobile: true }),
    rejected: () => ({ status: 'failed', reason: 'rejected' }),
  });
  const view = { tick, position, destination: target, range: 0, fatigue: 0, allowPartial: false };
  for (tick = 1; tick <= 3; tick++) {
    expect(navigate('a', { ...view, tick }).status).toBe('running');
    expect(issued).toBe(0);
    dispatch.flush(); dispatch.flush();
  }
  expect(avoidance).toEqual([false, true, true]);
  blocker = false;
  expect(navigate('a', { ...view, tick }).status).toBe('running');
  dispatch.flush();
  expect(issued).toBe(1);
  tick++;
  expect(navigate('a', { ...view, tick, position: target })).toEqual({ status: 'done' });
});
