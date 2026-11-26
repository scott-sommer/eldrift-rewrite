import { expect, test, vi } from 'vitest';
import { createTransportProbe } from '../../../src/app/remotes/transport-probe';
test('disabled diagnostics preserve the exact guard and operation result',() => {
  const probe = createTransportProbe(), guard = vi.fn(() => false), value = {};
  expect(probe.guard(guard)).toBe(guard);
  expect(probe.run('courier',() => probe.step('head',() => value))).toBe(value);
  expect(guard).not.toHaveBeenCalled();
});
test('diagnostics report the refusing stage once per actual guard call without altering admission',() => {
  const rows: string[] = [], probe = createTransportProbe((unit,phase) => rows.push(unit+':'+phase));
  const guard = vi.fn(() => false), checked = probe.guard(guard);
  expect(probe.run('courier',() => probe.step('admit',checked))).toBe(false);
  expect(guard).toHaveBeenCalledTimes(1);
  expect(rows).toContain('courier:transport:admit:denied');
  expect(rows.at(-1)).toBe('courier:transport:run:end');
});
test('throwing steps restore diagnostic scope and preserve the original exception',() => {
  const rows: string[] = [], probe = createTransportProbe((unit,phase) => rows.push(unit+':'+phase)), error = new Error('interrupted');
  expect(() => probe.run('first',() => probe.step('execute',() => { throw error; }))).toThrow(error);
  probe.run('second',() => probe.guard(() => false)());
  expect(rows).toContain('second:transport:run:denied');
  expect(rows).toContain('first:transport:execute:end');
});
