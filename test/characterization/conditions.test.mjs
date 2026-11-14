import fs from 'node:fs';
import vm from 'node:vm';
import { expect, test } from 'vitest';
const { cases } = JSON.parse(fs.readFileSync(new URL('../fixtures/legacy/conditions.json', import.meta.url), 'utf8'));
const expression = kind => cases.find(item => item.kind === kind).condition;

test('hunter bottom-border predicate writes the coordinate even when already at 49', () => {
  let writes = 0;
  const pos = { get y() { return 49; }, set y(value) { expect(value).toBe(49); writes++; } };
  expect(vm.runInNewContext(expression('assignment'), { creep: { pos } })).toBe(49);
  expect(writes).toBe(1);
});

test.each([NaN, 0, 5])('legacy NaN comparison never detects invalid distance %s', value => {
  expect(vm.runInNewContext(expression('nan'), { storageStartLength: value })).toBe(false);
});

test('invader-core attacker satisfies earlier general branch before specialized branch', () => {
  const creep = { memory: { role: 'attacker', remoteDefenseType: 'invaderCoreClear' } };
  expect(vm.runInNewContext(expression('generalDispatch'), { creep })).toBe(true);
  expect(vm.runInNewContext(expression('specialDispatch'), { creep })).toBe(true);
  const general = cases.find(item => item.kind === 'generalDispatch');
  const specialized = cases.find(item => item.kind === 'specialDispatch');
  expect(general.line).toBeLessThan(specialized.line);
  // Source inspection establishes these are branches of one else-if chain.
  // This predicate test deliberately does not claim full controller execution.
});
