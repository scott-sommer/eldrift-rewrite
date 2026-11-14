import { expect, test } from 'vitest';
import { createActionArbiter } from '../../../src/core/execution/action-arbiter';
const accepted = (code: number) => code === 0;
test('one owner may issue compatible slots but conflicting behaviors never invoke an action', () => {
  let tick = 1;
  let calls = 0;
  const arbiter = createActionArbiter(() => tick);
  const invoke = () => { calls++; return 0; };
  expect(arbiter.issue('a', 'mine', ['move'], invoke, accepted).status).toBe('issued');
  expect(arbiter.issue('a', 'mine', ['work'], invoke, accepted).status).toBe('issued');
  expect(arbiter.issue('a', 'mine', ['work'], invoke, accepted)).toEqual({ status: 'blocked', reason: 'action-conflict' });
  expect(arbiter.issue('a', 'haul', ['carry'], invoke, accepted)).toEqual({ status: 'blocked', reason: 'owner-conflict' });
  expect(calls).toBe(2);
  tick++;
  expect(arbiter.issue('a', 'haul', ['carry'], invoke, accepted).status).toBe('issued');
});
test('rejection frees slots while an uncertain exception retains the reservation', () => {
  const arbiter = createActionArbiter(() => 1);
  expect(arbiter.issue('a', 'mine', ['work'], () => -9, accepted).status).toBe('rejected');
  expect(() => arbiter.issue('a', 'mine', ['work'], () => { throw new Error('uncertain'); }, accepted)).toThrow('uncertain');
  expect(arbiter.issue('a', 'mine', ['work'], () => 0, accepted).status).toBe('blocked');
  expect(arbiter.issue('b', 'mine', ['work'], () => 0, accepted).status).toBe('issued');
});
