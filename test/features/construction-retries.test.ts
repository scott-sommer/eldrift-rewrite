import { expect, test } from 'vitest';
import { constructionRetries } from '../../src/features/construction/retries';
import type { PlanEntry } from '../../src/features/planning/plan-model';
const entry: PlanEntry = { type: 'road', x: 20, y: 25, rcl: 1, priority: 1, source: 'strategy' };
const policy = { attempts: 3, delay: 2, maximumDelay: 4 };
test('retry waits and quarantine survive detached snapshots with exact wake-up boundaries', () => {
  const first = constructionRetries({}, 1, policy);
  first.after(entry, { status: 'retry', reason: 'engine:-7' });
  expect(constructionRetries(first.snapshot(), 2, policy).before(entry)?.reason).toBe('retry-wait');
  const second = constructionRetries(first.snapshot(), 3, policy);
  expect(second.before(entry)).toBeUndefined();
  second.after(entry, { status: 'retry', reason: 'engine:-7' });
  const third = constructionRetries(second.snapshot(), 7, policy);
  third.after(entry, { status: 'retry', reason: 'engine:-7' });
  expect(constructionRetries(third.snapshot(), 100, policy).before(entry)?.status).toBe('invalid');
  third.after(entry, { status: 'created', reason: 'accepted' });
  expect(third.snapshot()).toEqual({});
});
test('budget/ownership waits do not consume retry allowance; explicit invalid results quarantine', () => {
  const retry = constructionRetries({}, 1, policy);
  retry.after(entry, { status: 'full', reason: 'site-limit' });
  retry.after(entry, { status: 'rcl', reason: 'controller' });
  expect(retry.snapshot()).toEqual({});
  retry.after(entry, { status: 'invalid', reason: 'arguments' });
  expect(retry.before(entry)?.reason).toBe('quarantined:arguments');
  expect(() => constructionRetries({}, -1, policy)).toThrow('tick');
});

test('observed completion retires quarantine so a later lost structure can be rebuilt', () => {
  const retry = constructionRetries({}, 1, policy);
  retry.after(entry, { status: 'invalid', reason: 'arguments' });
  expect(retry.before(entry)?.status).toBe('invalid');
  retry.present(entry);
  expect(retry.before(entry)).toBeUndefined();
  expect(retry.snapshot()).toEqual({});
});
