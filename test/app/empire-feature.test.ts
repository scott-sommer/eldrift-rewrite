import { expect, test } from 'vitest';
import { createRuntime } from '../../src/app/runtime';
import type { RuntimeFeature } from '../../src/app/runtime-model';

test('empire feature runs once across visible foreign rooms and without room ownership', () => {
  let tick = 1, names = ['W1N1','W2N1'];
  const seen: number[] = [], roomRuns: string[] = [];
  const features: RuntimeFeature[] = [
    { id: 'intel', scope: 'empire', urgency: 'background', interval: 1, run: context => {
      seen.push(context.world.tick);
      expect([...context.rooms.keys()]).toEqual(names);
      expect(context.config.values.layoutStrategy).toBe('auto');
      if (names.length) expect(context.rooms.get('W1N1')!.values.layoutStrategy).toBe('constrained');
    } },
    { id: 'economy', urgency: 'urgent', interval: 1, run: ({ room }) => { roomRuns.push(room.name); } },
  ];
  const runtime = createRuntime(features, {
    observations: { visibleRooms: () => names, observeRoom: name => ({ name, owned: false, units: [], structures: [] }) },
    config: name => name === 'W1N1' ? { roomOverride: { layoutStrategy: 'constrained' } } : {},
    clock: () => ({ tick, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0, reportFailure: () => {},
  });
  runtime.tick(); runtime.tick();
  tick++; names = []; runtime.tick();
  expect(seen).toEqual([1,2]);
  expect(roomRuns).toEqual([]);
});

test('empire failures and budget deferral preserve ordinary room work and retry next tick', () => {
  let tick = 1, enabled = false, calls = 0, rooms = 0;
  const runtime = createRuntime([
    { id: 'intel', scope: 'empire', urgency: 'background', interval: 1, run: () => { calls++; throw new Error('intel failure'); } },
    { id: 'economy', urgency: 'urgent', interval: 1, run: () => { rooms++; } },
  ], {
    observations: { visibleRooms: () => ['W1N1'], observeRoom: name => ({ name, owned: true, units: [], structures: [] }) },
    config: () => ({ empire: { backgroundEnabled: enabled } }),
    clock: () => ({ tick, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0, reportFailure: () => {},
  });
  expect(runtime.tick().failures).toEqual([]);
  expect(calls).toBe(0);
  tick++; enabled = true;
  expect(runtime.tick().failures).toMatchObject([{ id: 'empire/intel', tick: 2 }]);
  expect([calls, rooms]).toEqual([1,2]);
});
