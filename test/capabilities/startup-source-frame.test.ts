import { expect,test } from 'vitest';
import { StartupProjectSource } from '../../src/capabilities/economy/startup/project-source';
import { startupInitialMotionInput } from '../fixtures/startup-initial-motion';
test('source frame cannot skip, overlap or finish twice and replay regeneration',() => {
  const source = new StartupProjectSource(startupInitialMotionInput());
  expect(() => source.prepare(1,undefined)).toThrow('source frame phase');
  const frame = source.prepare(0,undefined);
  expect(() => source.prepare(0,undefined)).toThrow('source frame phase');
  frame.finish(); const before = JSON.stringify(source.delivery);
  expect(() => frame.finish()).toThrow('source frame phase');
  expect(JSON.stringify(source.delivery)).toBe(before);
  source.prepare(1,undefined).finish();
});
