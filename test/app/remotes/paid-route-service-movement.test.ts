import { afterEach,expect,test,vi } from 'vitest';
import { paidRouteControlFixture } from '../../fixtures/paid-route-control';
import { createPaidRouteServiceMovement } from '../../../src/app/remotes/startup/route-control/service-movement';
afterEach(() => vi.unstubAllGlobals());
test('productive service activates once, refreshes before dispatch and follows the observed multi-frame cursor',() => {
  const f = paidRouteControlFixture(),compile = vi.fn(() => ({ status: 'ready' as const,compilation: f.compiled }));
  const service = createPaidRouteServiceMovement(f.state,f.movement,f.control,compile,{ contexts: () => [f.context],activate: () => Game.time === 100,guard: () => true });
  service.before(); const before = JSON.stringify(f.root); service.before(); expect(JSON.stringify(f.root)).toBe(before); expect(compile).toHaveBeenCalledOnce();
  service.move(f.creep,f.command); expect(f.follow).toHaveBeenLastCalledWith(f.creep,f.command,expect.anything(),0);
  f.at(101,13); service.before(); service.move(f.creep,f.command);
  expect(f.follow).toHaveBeenLastCalledWith(f.creep,f.command,expect.anything(),1); expect(f.movement.move).not.toHaveBeenCalled();
});
test('activated service refuses missing fresh qualification while unactivated units retain ordinary movement',() => {
  const f = paidRouteControlFixture(); let available = true;
  const service = createPaidRouteServiceMovement(f.state,f.movement,f.control,() => ({ status: 'ready',compilation: f.compiled }),{ contexts: () => available ? [f.context] : undefined,activate: () => Game.time === 100,guard: () => true });
  service.before(); available = false; f.at(101,14); service.before();
  expect(service.move(f.creep,f.command)).toMatchObject({ reason: 'route-context-unavailable' }); expect(f.follow).not.toHaveBeenCalled();
  const other = { ...f.creep,name: 'ordinary' } as Creep; service.move(other,f.command);
  expect(f.movement.move).toHaveBeenCalledWith(other,f.command);
});
