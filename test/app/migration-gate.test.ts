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

test('checkpoint failure blocks gameplay, retries after reset, and preserves original failure', () => {
  let memory = {};
  let failCheckpoint = true;
  let tick = 1;
  let reads = 0;
  let writes = 0;
  const failure = new Error('checkpoint interrupted');
  const errors: unknown[] = [];
  const ports = {
    clock: () => ({ tick, tickLimit: 20, bucket: 10000 }), usedCpu: () => 0,
    config: () => { reads++; return {}; },
    observations: { visibleRooms: () => [], observeRoom: () => { throw new Error('unused'); } },
    reportFailure: (value: { error: unknown }) => errors.push(value.error),
  };
  function buildLoop() {
    const storage = createMemoryPort(() => memory);
    const gate = createMigrationGate({
      read: storage.read,
      write: (key, value) => {
        if (key === 'migrations/upgrade' && (value.data as { next: number }).next === 1 && failCheckpoint) throw failure;
        storage.write(key, value);
      },
    }, [{ id: 'upgrade', keys: ['fixture/one'], migrate: key => {
      // Idempotent record conversion models a write that completed before reset.
      if (storage.read(key) === undefined) {
        storage.write(key, { owner: 'fixture', version: 1, data: { converted: true } });
        writes++;
      }
    } }], ports);
    return createGameLoop([], ports, gate);
  }
  let loop = buildLoop();
  loop();
  loop();
  expect(errors).toEqual([failure]);
  expect(reads).toBe(0);
  expect(writes).toBe(1);
  memory = JSON.parse(JSON.stringify(memory));
  failCheckpoint = false;
  tick++;
  loop = buildLoop();
  loop();
  expect(reads).toBeGreaterThan(0);
  expect(writes).toBe(1);
  expect(createMemoryPort(() => memory).read('migrations/upgrade')).toMatchObject({ data: { next: 1 } });
});
