import { expect, test } from 'vitest';
import { createMigrationGate } from '../../src/app/migration-gate';
import { createGameLoop } from '../../src/app/game-loop';
import { createMemoryPort } from '../../src/adapters/screeps/memory';

test('migration gate shares its record allowance across plans and suppresses repeated tick calls', () => {
  const port = createMemoryPort(() => memory);
  const memory = {};
  let tick = 1;
  let cpu = 0;
  const seen: string[] = [];
  const plans = ['one', 'two'].map(id => ({ id, keys: [id], migrate: (key: string) => { seen.push(key); } }));
  const gate = createMigrationGate(port, plans, { clock: () => ({ tick, tickLimit: 20 }), usedCpu: () => cpu }, 1);
  expect(gate()).toBe(false);
  expect(gate()).toBe(false);
  expect(seen).toEqual(['one']);
  tick++;
  cpu = 10;
  expect(gate()).toBe(false);
  tick++;
  cpu = 0;
  expect(gate()).toBe(true);
  expect(seen).toEqual(['one', 'two']);
});

test('game loop defers configuration and observations until migrations are ready', () => {
  let ready = false;
  let reads = 0;
  const errors: unknown[] = [];
  const loop = createGameLoop([], {
    clock: () => ({ tick: 1, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0,
    config: () => { reads++; return {}; },
    observations: { visibleRooms: () => [], observeRoom: () => { throw new Error('unused'); } },
    reportFailure: failure => errors.push(failure),
  }, () => ready);
  loop();
  expect(reads).toBe(0);
  ready = true;
  loop();
  expect(reads).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
