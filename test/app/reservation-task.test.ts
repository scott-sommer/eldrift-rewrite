import { expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import type { ReservationTaskPorts } from '../../src/app/reservation-task';
import { createReservationTaskBehavior, validReservationPayload } from '../../src/app/reservation-task';
import { assignReservationTask } from '../../src/app/assign-reservation-task';
import { createTaskRunner, taskScope } from '../../src/app/task-runner';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { createReservations } from '../../src/persistence/reservations/store';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import type { Outcome } from '../../src/core/execution/model';
function fixture() {
  let tick = 1;
  const root = {}, port = createMemoryPort(() => root), assignments = createRemoteAssignmentStore(port);
  assignments.reconcile({ home: 'W0N1',tick,expectedRevision: 0,lifetime: 10,plans: [{ room: 'E0N1',sources: [],
    reserve: { id: 'controller',position: { room: 'E0N1',x: 25,y: 25 } },infrastructure: null }] });
  const token = remoteAssignmentDemands(assignments.read().assignments[0]!,tick)[0]!;
  const ports = { clock: () => tick,unit: () => 'reserver',service: vi.fn<ReservationTaskPorts<unknown>['service']>((): Outcome => ({ status: 'blocked',retryAt: tick + 1,reason: 'waiting' })),
    retire: vi.fn((): Outcome => ({ status: 'running' })) };
  const behaviors = { reserve: createReservationTaskBehavior(port,ports) }, schema = taskSchema('reserver',behaviors);
  const tasks = openState(port,'tasks/reserver',schema);
  tasks.queue.push({ id: 'reservation',kind: 'reserve',phase: 'work',payload: { home: 'W0N1',token },wakeAt: 0,retries: 0,expiresAt: 100 });
  saveState(port,'tasks/reserver',schema,tasks);
  return { port,root,assignments,ports,behaviors,schema,token,tick: (value: number) => { tick = value; },
    run: () => createTaskRunner(port,behaviors,() => tick)('reserver',{}) };
}
test('continuous reservation waits survive more than the task failure limit without losing authority', () => {
  const f = fixture();
  for (let tick = 1; tick <= 10; tick++) { f.tick(tick); expect(f.run()).toEqual({ status: 'running' }); }
  expect(f.ports.service).toHaveBeenCalledTimes(10);
  expect(openState(f.port,'tasks/reserver',f.schema).queue[0]!.retries).toBe(0);
  expect(f.ports.service.mock.calls[0]?.[2]).toBe(taskScope('reserver','reservation'));
});
test('expired authority retreats before task completion and terminal cleanup releases only its scope', () => {
  const f = fixture(), claims = createReservations(f.port);
  claims.acquire({ resource: 'own',holder: 'reserver',scope: taskScope('reserver','reservation'),expiresAt: 100 },1);
  claims.acquire({ resource: 'other',holder: 'other',scope: 'other',expiresAt: 100 },1);
  f.tick(11); expect(f.run()).toEqual({ status: 'running' }); expect(f.ports.service).not.toHaveBeenCalled();
  f.ports.retire.mockReturnValue({ status: 'done' }); f.tick(12); expect(f.run()).toEqual({ status: 'done' });
  expect(openState(f.port,'tasks/reserver',f.schema).queue).toEqual([]);
  expect(openState(f.port,'reservations/empire',reservationSchema).claims.map(claim => claim.resource)).toEqual(['other']);
});
test('changed assignment generation retires old work immediately and malformed tokens are refused', () => {
  const f = fixture(); f.assignments.reconcile({ home: 'W0N1',tick: 2,expectedRevision: 1,lifetime: 10,plans: [] });
  f.tick(2); f.run(); expect(f.ports.service).not.toHaveBeenCalled(); expect(f.ports.retire).toHaveBeenCalledTimes(1);
  expect(validReservationPayload({ home: 'W0N1',token: { ...f.token,generation: 0 } })).toBe(false);
  expect(validReservationPayload({ home: 'invalid',token: f.token })).toBe(false);
});

test('task renewal follows current lease expiry while preserving identity and unrelated queued work', () => {
  const f = fixture();
  f.assignments.reconcile({ home: 'W0N1',tick: 2,expectedRevision: 1,lifetime: 20,plans: f.assignments.read().assignments.map(item => item.plan) });
  const demand = remoteAssignmentDemands(f.assignments.read().assignments[0]!,2)[0]!;
  if (demand.kind !== 'reserve') throw new Error('Expected reserve');
  expect(assignReservationTask(f.port,f.behaviors,'reserver',demand,2,60)).toBe('reservation');
  f.tick(12); f.run(); expect(f.ports.service).toHaveBeenCalledTimes(1);
  const definitions = { ...f.behaviors,other: { phases: ['work'],validPayload: () => true } };
  const schema = taskSchema('reserver',definitions), tasks = openState(f.port,'tasks/reserver',schema);
  tasks.queue.unshift({ id: 'other-work',kind: 'other',phase: 'work',payload: null,wakeAt: 0,retries: 0,expiresAt: 60 });
  saveState(f.port,'tasks/reserver',schema,tasks);
  const before = JSON.stringify(f.root);
  expect(assignReservationTask(f.port,definitions,'reserver',demand,12,60)).toBeUndefined();
  expect(JSON.stringify(f.root)).toBe(before);
});
