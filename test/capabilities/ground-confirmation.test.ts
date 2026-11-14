import { expect, test } from 'vitest';
import { confirmGroundRelease, type GroundAttempt } from '../../src/capabilities/logistics/ground-confirmation';
const attempt: GroundAttempt = { id: 'release', unit: 'hauler-id', resource: 'energy', tick: 10,
  position: { room: 'E0N1', x: 20, y: 21 }, amount: 50, cargoBefore: 80, hitsBefore: 100, groundBefore: 1000 };
const observation = { tick: 11, unit: attempt.unit, position: attempt.position, cargo: 30, hits: 100, ground: 1048, isolated: true };
test('ground release requires next-tick evidence and permits the bounded decay of an existing pile', () => {
  expect(confirmGroundRelease(attempt, { tick: 10 }, 1000)).toEqual({ status: 'waiting' });
  expect(confirmGroundRelease(attempt, observation, 1000)).toEqual({ status: 'released', amount: 50 });
  expect(confirmGroundRelease(attempt, { ...observation, ground: 1050 }, 1000)).toEqual({ status: 'released', amount: 50 });
});
test('cargo loss alone cannot establish release after damage, replacement, movement or competing actions', () => {
  for (const changed of [{ hits: 99 }, { unit: 'replacement' }, { position: { ...attempt.position, x: 21 } },
    { isolated: false }, { cargo: 29 }, { cargo: 80 }, { tick: 12 }, { ground: 1047 }, { ground: 1051 }]) {
    expect(confirmGroundRelease(attempt, { ...observation, ...changed }, 1000)).toEqual({ status: 'unknown' });
  }
  expect(confirmGroundRelease(attempt, { tick: 11, cargo: 30 }, 1000)).toEqual({ status: 'unknown' });
});
test('invalid attempts and observation timing fail before producing a receipt', () => {
  expect(() => confirmGroundRelease({ ...attempt, amount: 81 }, observation, 1000)).toThrow();
  expect(() => confirmGroundRelease(attempt, { tick: 9 }, 1000)).toThrow();
  expect(() => confirmGroundRelease(attempt, observation, 0)).toThrow();
});
