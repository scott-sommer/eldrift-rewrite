import { expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createRemoteAssignmentStore } from '../../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../src/features/remotes/assignment-demand';
import { assignRemoteTask } from '../../../src/app/remotes/assign-task';
import { validRemoteTaskPayload } from '../../../src/app/remotes/task';
const definitions = { 'remote-mine': { phases: ['work'],validPayload: validRemoteTaskPayload } };
function fixture() {
  let root = {};
  const state = createMemoryPort(() => root), assignments = createRemoteAssignmentStore(state);
  const plan = { room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null };
  const apply = (tick: number,plans = [plan]) => assignments.reconcile({ home: 'W0N1',tick,lifetime: 100,plans,expectedRevision: assignments.read().revision });
  apply(10);
  const demand = (tick: number) => remoteAssignmentDemands(assignments.read().assignments[0]!,tick)[0]!;
  const write = vi.spyOn(state,'write');
  const run = (tick: number,lifetime: number) => assignRemoteTask(state,definitions,'remote-mine','miner',demand(tick),tick,lifetime);
  const task = () => (state.read('tasks/miner') as { data: { queue: { id: string; expiresAt: number; payload: { token: { expiresAt: number } } }[] } }).data.queue[0]!;
  return { state,assignments,plan,apply,demand,write,run,task,reset: () => { root = JSON.parse(JSON.stringify(root)); } };
}
test('unchanged renewal survives reset without rewriting while actual expiry changes persist',() => {
  const f = fixture(), id = f.run(10,100); f.write.mockClear(); f.reset();
  expect(f.run(11,99)).toBe(id); expect(f.write).not.toHaveBeenCalled(); expect(f.task().expiresAt).toBe(110);
  expect(f.run(12,100)).toBe(id); expect(f.write).toHaveBeenCalledTimes(1); expect(f.task().expiresAt).toBe(112);
});
test('current lease renewal updates the token even when absolute task expiry stays fixed',() => {
  const f = fixture(), id = f.run(10,100); f.apply(11); f.write.mockClear();
  expect(f.run(11,99)).toBe(id); expect(f.write).toHaveBeenCalledTimes(1); expect(f.task().payload.token.expiresAt).toBe(111);
});
test('unchanged task cannot bypass withdrawal, changed generation or expired authority',() => {
  const f = fixture(), old = f.demand(10); f.run(10,100); const before = f.task();
  f.apply(11,[]); f.write.mockClear();
  expect(assignRemoteTask(f.state,definitions,'remote-mine','miner',old,11,99)).toBeUndefined();
  expect(f.write).not.toHaveBeenCalled(); expect(f.task()).toEqual(before);
  f.apply(12); f.write.mockClear();
  expect(f.run(12,98)).toBeUndefined(); expect(f.write).not.toHaveBeenCalled(); expect(f.task()).toEqual(before);
  expect(assignRemoteTask(f.state,definitions,'remote-mine','miner',old,110,1)).toBeUndefined();
});
