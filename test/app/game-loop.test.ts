import { expect, test } from 'vitest';
import { createGameLoop } from '../../src/app/game-loop';
import type { Failure } from '../../src/core/scheduling/model';

test('loop reports room observation failures and survives a later top-level configuration failure', () => {
  const failures: Failure[] = [];
  let invalid = false;
  let tick = 1;
  const loop = createGameLoop([], {
    observations: { visibleRooms: () => ['bad'], observeRoom: () => { throw new Error('unseen'); } },
    config: () => invalid ? { empire: { unexpected: 1 } } : {},
    clock: () => ({ tick, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0,
    reportFailure: failure => failures.push(failure),
  });
  loop();
  expect(failures[0]).toMatchObject({ id: 'observation', room: 'bad' });
  invalid = true;
  tick++;
  expect(loop).not.toThrow();
  expect(failures[1]?.id).toBe('runtime');
});


test('dispatch follows feature work once per tick even after a feature or dispatch failure', () => {
  let tick = 1;
  const events: string[] = [];
  const failures: Failure[] = [];
  const loop = createGameLoop([{ id: 'planner', urgency: 'urgent', interval: 1, run: () => { events.push('plan'); throw new Error('feature'); } }], {
    observations: { visibleRooms: () => ['W0N0'], observeRoom: () => ({ name: 'W0N0', owned: true, units: [], structures: [] }) },
    config: () => ({}), clock: () => ({ tick, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0,
    reportFailure: failure => failures.push(failure),
  }, () => true, () => { events.push('dispatch'); throw new Error('intent uncertainty'); });
  loop(); loop();
  expect(events).toEqual(['plan', 'dispatch']);
  expect(failures.map(failure => failure.id)).toEqual(['W0N0/planner', 'dispatch']);
  tick++;
  loop();
  expect(events).toEqual(['plan', 'dispatch', 'plan', 'dispatch']);
});

test('migration or top-level configuration failure prevents dispatch', () => {
  let admitted = false;
  let calls = 0;
  const loop = createGameLoop([], {
    observations: { visibleRooms: () => [], observeRoom: () => { throw new Error('unused'); } },
    config: () => { throw new Error('invalid configuration'); },
    clock: () => ({ tick: 1, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0, reportFailure: () => {},
  }, () => admitted, () => { calls++; });
  loop();
  admitted = true;
  loop();
  expect(calls).toBe(0);
});
