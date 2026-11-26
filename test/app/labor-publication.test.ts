import { expect, test } from 'vitest';
import { createLaborPublication } from '../../src/app/labor-publication';
import { createLaborBirthAdmission } from '../../src/app/labor-birth-admission';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { peekSpawnIdentity } from '../../src/features/population/spawn-identity';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
import type { StatePort } from '../../src/persistence/versioned-state';
function fixture(fault?: 'identity' | 'task' | 'queue') {
  const f = laborProposalFixture(), id = 'ed-W0N1-1'; f.input.request.id = id; f.input.request.name = id; f.input.birth.request = id;
  const ready = f.propose(f.input); if (ready.status !== 'ready') throw new Error('Expected proposal');
  const proposal = ready.read(); let root = {},tick = 1,tripped = false,born = false,occupied = false;
  const base = createMemoryPort(() => root);
  const state: StatePort = { read: key => base.read(key),write(key,value) {
    base.write(key,value);
    const trigger = fault === 'identity' ? key === 'spawn-identities/W0N1' && (value.data as { next: number }).next === 2 : fault === 'task' ? key.startsWith('tasks/') && (value.data as { queue: unknown[] }).queue.length === 1 : fault === 'queue' && key === 'spawning/W0N1' && (value.data as { requests: unknown[] }).requests.length === 1;
    if (trigger && !tripped) { tripped = true; throw new Error('interrupt'); }
  } };
  const publisher = () => createLaborPublication(state,'W0N1',{ now: () => tick,occupied: () => occupied,born: () => born });
  const publish = (admitted = true) => publisher().publish(proposal,() => true,() => admitted);
  return { state,proposal,publish,publisher,at: (value: number) => { tick = value; },born: () => { born = true; occupied = true; },reload: () => { root = JSON.parse(JSON.stringify(root)); },root: () => JSON.stringify(root),queue: () => createSpawnQueue(state,'W0N1').list(),task: () => createLaborTaskStaging(state).read(id) };
}
test('current admitted proposal publishes exactly one checked identity, guarded birth and task across reconstruction',() => {
  const f = fixture(); expect(f.publish()).toBe('published'); f.reload(); expect(f.publish()).toBe('existing');
  expect(peekSpawnIdentity(f.state,'W0N1')).toBe('ed-W0N1-2'); expect(f.queue()).toHaveLength(1); expect(f.task()?.queue).toHaveLength(1);
  const admit = createLaborBirthAdmission(f.state,{ now: () => 1,current: () => true });
  expect(admit(f.queue()[0]!)).toBe(true);
});
test.each(['task','queue'] as const)('partial %s write reconstructs without duplicate identity or queue entry',fault => {
  const f = fixture(fault); expect(f.publish).toThrow('interrupt'); f.reload();
  expect(createLaborBirthAdmission(f.state,{ now: () => 1,current: () => true })(f.publisher().read()!.request)).toBe(false);
  expect(f.publish()).toBe('published');
  expect(f.queue()).toHaveLength(1); expect(f.task()?.queue).toHaveLength(1); expect(peekSpawnIdentity(f.state,'W0N1')).toBe('ed-W0N1-2');
});
test('identity interruption skips the uncertain reservation and cannot reuse it',() => {
  const f = fixture('identity'); expect(f.publish).toThrow('interrupt'); f.reload(); expect(f.publish()).toBe('identity-conflict');
  expect(f.publisher().read()).toBeNull(); expect(f.task()).toBeUndefined(); expect(f.queue()).toEqual([]); expect(peekSpawnIdentity(f.state,'W0N1')).toBe('ed-W0N1-2');
});
test('denied initial proposal writes nothing; revocation blocks payment before later scoped withdrawal',() => {
  const f = fixture(), before = f.root(); expect(f.publish(false)).toBe('refused'); expect(f.root()).toBe(before);
  f.publish(); expect(f.publish(false)).toBe('refused');
  expect(createLaborBirthAdmission(f.state,{ now: () => 1,current: () => true })(f.queue()[0]!)).toBe(false);
  expect(f.task()?.queue).toHaveLength(1); f.at(2); expect(f.publisher().maintain()).toBe('withdrawn'); expect(f.queue()).toEqual([]); expect(f.task()?.queue).toEqual([]);
});
test('observed paid birth releases only publication journal and preserves execution task',() => {
  const f = fixture(); f.publish(); f.born(); f.at(2);
  expect(f.publisher().maintain()).toBe('born'); expect(f.publisher().read()).toBeNull(); expect(f.task()?.queue).toHaveLength(1);
});

test('withdrawal refuses a changed queue owner and leaves its task intact',() => {
  const f = fixture(); f.publish(); const replacement = { ...f.queue()[0]!,owner: 'replacement' };
  f.state.write('spawning/W0N1',{ owner: 'population',version: 4,data: { requests: [replacement] } });
  f.at(2); expect(f.publisher().maintain()).toBe('conflict');
  expect(f.queue()).toEqual([replacement]); expect(f.task()?.queue).toHaveLength(1); expect(f.publisher().read()?.phase).toBe('queued');
});
