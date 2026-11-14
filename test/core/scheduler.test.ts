import { expect, test } from 'vitest';
import { createScheduler } from '../../src/core/scheduling/scheduler';
import type { Failure, ScheduledWork } from '../../src/core/scheduling/model';
const budget = { tick: 0, tickLimit: 10, bucket: 10000, backgroundEnabled: true, backgroundCpuFraction: 0.5, minimumBucket: 1000 };

test('urgent work precedes background and failures retain room and original error', () => {
  const calls: string[] = [];
  const failures: Failure[] = [];
  const error = new Error('failure');
  const work: ScheduledWork[] = [
    { id: 'background', urgency: 'background', interval: 1, run: () => { calls.push('background'); } },
    { id: 'urgent-a', room: 'W1N1', urgency: 'urgent', interval: 1, run: () => { throw error; } },
    { id: 'urgent-b', room: 'W2N2', urgency: 'urgent', interval: 1, run: () => { calls.push('urgent'); } },
  ];
  createScheduler(work, { usedCpu: () => 0, reportFailure: failure => failures.push(failure) }, 0).run(budget);
  expect(calls).toEqual(['urgent', 'background']);
  expect(failures).toEqual([{ id: 'urgent-a', room: 'W1N1', tick: 0, error }]);
});

test('overdue background tasks rotate fairly when only one fits each tick', () => {
  let used = 0;
  const calls: string[] = [];
  const work = ['a', 'b', 'c'].map(id => ({ id, urgency: 'background' as const, interval: 1, run: () => { calls.push(id); used = 5; } }));
  const scheduler = createScheduler(work, { usedCpu: () => used, reportFailure: () => {} }, 0);
  for (let tick = 0; tick < 6; tick++) {
    used = 0;
    scheduler.run({ ...budget, tick });
  }
  expect(calls).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
});

test('bucket gate blocks background but allows urgent work, and hard budget stops both', () => {
  const calls: string[] = [];
  let used = 0;
  const work = ['urgent', 'background'].map(urgency => ({ id: urgency, urgency: urgency as 'urgent' | 'background', interval: 1, run: () => { calls.push(urgency); } }));
  const scheduler = createScheduler(work, { usedCpu: () => used, reportFailure: () => {} }, 0);
  scheduler.run({ ...budget, bucket: 0 });
  expect(calls).toEqual(['urgent']);
  used = 10;
  scheduler.run({ ...budget, tick: 1 });
  expect(calls).toEqual(['urgent']);
});

test('diagnostic sink failure does not prevent independent work or erase the original failure', () => {
  let ran = false;
  const error = new Error('original');
  const scheduler = createScheduler([
    { id: 'a', urgency: 'urgent', interval: 1, run: () => { throw error; } },
    { id: 'b', urgency: 'urgent', interval: 1, run: () => { ran = true; } },
  ], { usedCpu: () => 0, reportFailure: () => { throw new Error('sink failed'); } }, 0);
  expect(scheduler.run(budget)[0]?.error).toBe(error);
  expect(ran).toBe(true);
});

test('staggering is deterministic across construction order and avoids running every job at startup', () => {
  function schedule(ids: string[]) {
    const calls: string[] = [];
    let tick = 0;
    const work = ids.map(id => ({ id, urgency: 'background' as const, interval: 3, run: () => { calls.push(`${tick}:${id}`); } }));
    const scheduler = createScheduler(work, { usedCpu: () => 0, reportFailure: () => {} }, 0);
    for (tick = 0; tick < 6; tick++) scheduler.run({ ...budget, tick });
    return calls;
  }
  const calls = schedule(['a', 'b', 'c']);
  expect(calls).toEqual(schedule(['c', 'a', 'b']));
  expect(calls).toHaveLength(6);
  expect(calls.filter(call => call.startsWith('0:'))).toHaveLength(1);
});
