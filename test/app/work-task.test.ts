import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createWorkTaskBehavior } from '../../src/app/work-task';
import { reconcileWorkTask } from '../../src/app/reconcile-work-task';
import { createTaskRunner, taskScope } from '../../src/app/task-runner';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import type { WorkOrder } from '../../src/capabilities/work/assessment';
const unit = { name: 'worker', id: 'unit1', home: 'W0N0' };
const order: WorkOrder = { id: 'site', kind: 'build', position: { room: 'W0N0', x: 20, y: 20 }, priority: 20, score: 10 };
function fixture() {
  const memory = {};
  const state = createMemoryPort(() => memory);
  const behavior = createWorkTaskBehavior<typeof unit>({ identity: value => value,
    run: () => ({ status: 'blocked', reason: 'energy-empty', retryAt: 2 }) });
  const definitions = { work: behavior };
  const schema = taskSchema(unit.name, definitions);
  const read = () => openState(state, 'tasks/worker', schema);
  return { state, behavior, definitions, schema, read };
}
test('work identity survives changing selection scores, reconstruction and temporary blockage', () => {
  const { state, definitions, read } = fixture();
  reconcileWorkTask(state, definitions, unit, 1, () => order);
  const original = read().queue[0]!;
  for (let tick = 2; tick < 20; tick++) {
    reconcileWorkTask(state, definitions, unit, tick, current => {
      expect(current?.id).toBe('site');
      return { ...order, score: tick };
    });
    const run = createTaskRunner(state, definitions, () => tick);
    expect(run(unit.name, unit)?.status).toBe('running');
    expect(read().queue[0]).toMatchObject({ id: original.id, expiresAt: 101, retries: 0 });
  }
});
test('preemption, cancellation and expiry retire only the previous work scope', () => {
  const { state, definitions, read } = fixture();
  reconcileWorkTask(state, definitions, unit, 1, () => order);
  const first = read().queue[0]!;
  const reservations = createReservations(state);
  reservations.acquire({ resource: 'site', holder: unit.name, scope: taskScope(unit.name, first.id), expiresAt: 200 }, 1);
  reservations.acquire({ resource: 'other', holder: 'other', scope: 'unrelated', expiresAt: 200 }, 1);
  reconcileWorkTask(state, definitions, unit, 2, () => ({ ...order, id: 'controller', kind: 'upgrade', priority: 0 }));
  expect(read().queue[0]!.id).not.toBe(first.id);
  expect(openState(state, 'reservations/empire', reservationSchema).claims.map(claim => claim.scope)).toEqual(['unrelated']);
  const second = read().queue[0]!;
  reconcileWorkTask(state, definitions, unit, 102, current => current);
  expect(read().queue[0]!.id).not.toBe(second.id);
  reconcileWorkTask(state, definitions, unit, 103, () => undefined);
  expect(read().queue).toEqual([]);
});
test('foreign queued work is preserved and not executed by the worker runner', () => {
  const { state, behavior } = fixture();
  const definitions = { work: behavior, foreign: { phases: ['wait'], validPayload: () => true } };
  const schema = taskSchema(unit.name, definitions);
  const tasks = openState(state, 'tasks/worker', schema);
  tasks.queue.push({ id: 'foreign', kind: 'foreign', phase: 'wait', payload: null, wakeAt: 0, retries: 0, expiresAt: 100 });
  saveState(state, 'tasks/worker', schema, tasks);
  reconcileWorkTask(state, definitions, unit, 1, () => { throw new Error('must not select'); });
  expect(createTaskRunner(state, { work: behavior }, () => 1, definitions)(unit.name, unit)).toBeUndefined();
  expect(openState(state, 'tasks/worker', schema)).toEqual(tasks);
});
test('replacement identity starts fresh and invalid selection leaves previous work intact', () => {
  const { state, definitions, read } = fixture();
  reconcileWorkTask(state, definitions, unit, 1, () => order);
  const before = read();
  expect(() => reconcileWorkTask(state, definitions, unit, 2, () => ({ ...order, position: { ...order.position, x: 50 } }))).toThrow('Invalid selected');
  expect(read()).toEqual(before);
  reconcileWorkTask(state, definitions, { ...unit, id: 'replacement' }, 2, current => {
    expect(current).toBeUndefined(); return order;
  });
  expect(read().queue[0]!.payload).toMatchObject({ unitId: 'replacement' });
  expect(createTaskRunner(state, definitions, () => 3)(unit.name, unit)?.status).toBe('failed');
  expect(read().queue).toEqual([]);
});
