import { afterEach, expect, test, vi } from 'vitest';
import { createNativeFlagTargets } from '../../src/adapters/screeps/flag-targets';
afterEach(() => vi.unstubAllGlobals());
test('flag matching retains substring semantics with stable selection and detached tick-local positions', () => {
  const a = { roomName: 'W0N1', x: 40, y: 25 }, z = { roomName: 'W1N1', x: 10, y: 25 };
  vi.stubGlobal('Game', { time: 1, flags: { 'Z:Scout': { pos: z }, 'A:Scout': { pos: a } } });
  const targets = createNativeFlagTargets(), first = targets.resolve('Scout')!;
  expect(first).toEqual({ room: 'W0N1', x: 40, y: 25 });
  first.x = 0; a.x = 10;
  expect(targets.resolve('Scout')!.x).toBe(40);
  Game.time++;
  expect(targets.resolve('Scout')!.x).toBe(10);
  delete Game.flags['A:Scout']; Game.time++;
  expect(targets.resolve('Scout')!.room).toBe('W1N1');
  expect(targets.resolve('absent')).toBeUndefined();
});
test('an empty selector performs no native reads and malformed native goals fail explicitly', () => {
  expect(createNativeFlagTargets().resolve('')).toBeUndefined();
  vi.stubGlobal('Game', { time: 1, flags: { Scout: { pos: { roomName: 'W0N1', x: 50, y: 25 } } } });
  expect(() => createNativeFlagTargets().resolve('Scout')).toThrow();
});
