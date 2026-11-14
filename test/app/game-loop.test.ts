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

