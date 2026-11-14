import { expect, test } from 'vitest';
import { createRuntime } from '../../src/app/runtime';

test('runtime resolves per-room diplomacy and continues after another room feature fails', () => {
  let tick = 1;
  const seen: string[] = [];
  const runtime = createRuntime([{ id: 'economy', urgency: 'urgent', interval: 1, run: ({ room, world, config }) => {
    expect(world.tick).toBe(tick);
    expect(config.values.minimumBucket).toBe(0);
    if (room.name === 'bad') throw new Error('room failure');
    seen.push(room.name);
  } }], {
    observations: { visibleRooms: () => ['bad', 'good'], observeRoom: name => ({ name, owned: true, units: [], structures: [] }) },
    config: () => ({ empire: { minimumBucket: 0 } }),
    clock: () => ({ tick, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0, reportFailure: () => {},
  });
  expect(runtime.tick().failures[0]?.room).toBe('bad');
  tick++;
  expect(runtime.tick().failures[0]?.room).toBe('bad');
  expect(seen).toEqual(['good', 'good']);
});
