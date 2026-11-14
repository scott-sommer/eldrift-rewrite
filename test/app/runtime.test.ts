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

test('room background overrides apply without blocking another room and deferred work resumes', () => {
  let tick = 0;
  let enabled = false;
  const seen: string[] = [];
  const runtime = createRuntime([{ id: 'planning', urgency: 'background', interval: 1, run: ({ room }) => { seen.push(room.name); } }], {
    observations: { visibleRooms: () => ['a', 'b'], observeRoom: name => ({ name, owned: true, units: [], structures: [] }) },
    config: name => name === 'a' ? { roomOverride: { backgroundEnabled: enabled, minimumBucket: 0 } } : { empire: { minimumBucket: 0 } },
    clock: () => ({ tick, tickLimit: 20, bucket: 0 }), usedCpu: () => 0, reportFailure: () => {},
  });
  runtime.tick();
  expect(seen).toEqual(['b']);
  enabled = true;
  tick++;
  runtime.tick();
  expect(seen).toEqual(['b', 'a', 'b']);
});

test('synchronizing room work each tick preserves fairness under a one-job CPU allowance', () => {
  let tick = 0;
  let used = 0;
  let names = ['a', 'b'];
  const seen: string[] = [];
  const runtime = createRuntime([{ id: 'planning', urgency: 'background', interval: 1, run: ({ room }) => { seen.push(room.name); used = 5; } }], {
    observations: { visibleRooms: () => names, observeRoom: name => ({ name, owned: true, units: [], structures: [] }) },
    config: () => ({}), clock: () => ({ tick, tickLimit: 10, bucket: 10000 }), usedCpu: () => used, reportFailure: () => {},
  });
  for (tick = 0; tick < 4; tick++) { used = 0; runtime.tick(); }
  expect(seen).toEqual(['a', 'b', 'a', 'b']);
  names = ['c'];
  used = 0;
  runtime.tick();
  expect(seen.at(-1)).toBe('c');
});
