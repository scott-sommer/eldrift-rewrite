import { expect, test } from 'vitest';
import { createUnitLifecycle } from '../../src/app/unit-lifecycle';
import { createCreepMaintenance } from '../../src/app/creep-maintenance';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import type { Envelope, StatePort } from '../../src/persistence/versioned-state';
import { unitRosterSchema } from '../../src/persistence/units/schema';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';

test('retirement survives reset, clears only local tasks/claims and handles name reuse', () => {
  let memory = {};
  const port = createMemoryPort(() => memory);
  const definitions = { mine: { phases: ['work'], validPayload: (v: unknown) => v === null } };
  let roster = [{ name: 'worker', id: 'old' }, { name: 'remote', id: 'remote-id' }];
  let maintain = createCreepMaintenance(port, () => roster, definitions);
  expect(maintain()).toBe(true);
  const schema = taskSchema('worker', definitions);
  const tasks = openState(port, 'tasks/worker', schema);
  tasks.queue.push({ id: 'job', kind: 'mine', phase: 'work', payload: null, retries: 0, wakeAt: 0, expiresAt: 99 });
  saveState(port, 'tasks/worker', schema, tasks);
  const claims = createReservations(port);
  claims.acquire({ resource: 'slot', holder: 'worker', scope: 'job', expiresAt: 99 }, 1);
  claims.acquire({ resource: 'remote-slot', holder: 'remote', scope: 'remote-job', expiresAt: 99 }, 1);
  port.write('missions/keep', { owner: 'missions', version: 1, data: { retained: true } });
  memory = JSON.parse(JSON.stringify(memory));
  maintain = createCreepMaintenance(port, () => roster, definitions);
  expect(maintain()).toBe(true); // Reset and room changes cannot imply death.
  expect(openState(port, 'tasks/worker', schema).queue).toHaveLength(1);
  roster = [{ name: 'worker', id: 'replacement' }, roster[1]!];
  expect(maintain()).toBe(true);
  expect(openState(port, 'tasks/worker', schema).queue).toEqual([]);
  expect(openState(port, 'reservations/empire', reservationSchema).claims.map(c => c.holder)).toEqual(['remote']);
  expect(port.read('missions/keep')).toMatchObject({ data: { retained: true } });
  expect(openState(port, 'units/creeps', unitRosterSchema).units).toEqual(roster);
});

test('bounded retirement checkpoints progress and retries an interrupted effect before admission', () => {
  let memory = {};
  const base = createMemoryPort(() => memory);
  let roster = [{ name: 'a', id: '1' }, { name: 'b', id: '2' }];
  const retired: string[] = [];
  let fail = false;
  const port: StatePort = { read: key => base.read(key), write(key: string, value: Envelope) {
    if (fail && key === 'units/creeps') { fail = false; throw new Error('checkpoint interrupted'); }
    base.write(key, value);
  } };
  let maintain = createUnitLifecycle(port, () => roster, name => retired.push(name), 1);
  maintain();
  roster = [];
  fail = true;
  expect(maintain).toThrow('checkpoint interrupted');
  memory = JSON.parse(JSON.stringify(memory));
  maintain = createUnitLifecycle(port, () => roster, name => retired.push(name), 1);
  expect(maintain()).toBe(false);
  expect(retired).toEqual(['a', 'a']); // Caller effects must be idempotent.
  expect(maintain()).toBe(true);
  expect(retired).toEqual(['a', 'a', 'b']);
  expect(openState(port, 'units/creeps', unitRosterSchema).units).toEqual([]);
});

test('invalid observations cannot retire units or overwrite the last valid roster', () => {
  const memory = {};
  const port = createMemoryPort(() => memory);
  let roster = [{ name: 'a', id: '1' }];
  let calls = 0;
  const maintain = createUnitLifecycle(port, () => roster, () => { calls++; });
  maintain();
  const before = JSON.stringify(memory);
  roster = [{ name: 'a', id: '1' }, { name: 'a', id: '2' }];
  expect(maintain).toThrow('Invalid owned-creep roster');
  expect(calls).toBe(0);
  expect(JSON.stringify(memory)).toBe(before);
});
