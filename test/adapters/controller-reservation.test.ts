import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeControllerActions } from '../../src/adapters/screeps/controller-actions';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  for (const [name,value] of Object.entries({ OK: 0,ERR_BUSY: -4,ERR_NOT_OWNER: -1,ERR_INVALID_TARGET: -7,ERR_GCL_NOT_ENOUGH: -15 })) vi.stubGlobal(name,value);
  const game = { time: 1,gcl: { level: 1 },rooms: {} }; vi.stubGlobal('Game',game);
  const root = {}, port = createMemoryPort(() => root);
  const creep = { id: 'unit',name: 'unit',my: true,owner: { username: 'bot' },reserveController: vi.fn(() => 0),claimController: vi.fn(() => 0) } as unknown as Creep;
  const controller = { id: 'target',owner: undefined,reservation: undefined } as unknown as StructureController;
  const actions = () => createNativeControllerActions(port,createActionArbiter(() => game.time));
  return { game,root,creep,controller,actions };
}
test('controller reservation is durably admitted once per tick across reset and competing units', () => {
  const f = fixture(); expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(0);
  expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(-4);
  const other = { ...f.creep,id: 'other',name: 'other',reserveController: vi.fn(() => 0) } as unknown as Creep;
  expect(f.actions().reserve(other,f.controller,'other')).toBe(-4);
  expect(other.reserveController).not.toHaveBeenCalled(); expect(f.creep.reserveController).toHaveBeenCalledTimes(1);
  f.game.time = 2; expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(0);
});
test('rejected or throwing reserve calls keep durable admission and cannot be retried after reset', () => {
  const f = fixture(); vi.mocked(f.creep.reserveController).mockReturnValue(-9);
  expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(-9);
  expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(-4);
  f.game.time = 2; vi.mocked(f.creep.reserveController).mockImplementation(() => { throw new Error('native failure'); });
  expect(() => f.actions().reserve(f.creep,f.controller,'reserve')).toThrow('native failure');
  expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(-4);
});
test('foreign control cannot be reserved, and reserve and claim share per-unit controller admission', () => {
  const f = fixture(); f.controller.reservation = { username: 'other',ticksToEnd: 50 };
  expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(-7); expect(f.root).toEqual({});
  f.controller.reservation = { username: 'bot',ticksToEnd: 50 };
  expect(f.actions().reserve(f.creep,f.controller,'reserve')).toBe(0);
  expect(f.actions().claim(f.creep,{ ...f.controller,id: 'other-target' } as StructureController,'claim')).toBe(-4);
  expect(f.creep.claimController).not.toHaveBeenCalled();
});
test('reservation respects the existing creep action owner without invoking native code', () => {
  const f = fixture(), arbiter = createActionArbiter(() => f.game.time);
  arbiter.issue(f.creep.name,'other',['move'],() => 0,code => code === 0);
  expect(createNativeControllerActions(createMemoryPort(() => f.root),arbiter).reserve(f.creep,f.controller,'reserve')).toBe(-4);
  expect(f.creep.reserveController).not.toHaveBeenCalled();
});
