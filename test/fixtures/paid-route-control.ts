import { expect,vi } from 'vitest';
import { paidRouteFixture } from './paid-route';
import { createPaidCourierRouteControl } from '../../src/app/remotes/startup/route-control/control';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createPaidCourierRouteStore } from '../../src/features/remotes/startup/routes/store';
export function paidRouteControlFixture() {
  const f = paidRouteFixture(),root = {},state = createMemoryPort(() => root); let tick = 100,version = 'matrix-v1';
  vi.stubGlobal('Game',{ get time() { return tick; } });
  const follow = vi.fn(() => {
    expect(createPaidCourierRouteStore(state,'W0N1').read().routes[0]!.cursor!.requestedAt).toBe(tick);
    return { status: 'running' as const };
  });
  const movement = { follow,move: vi.fn(() => ({ status: 'running' as const })) };
  const control = createPaidCourierRouteControl(state,movement,() => ({ status: 'ready',opening: f.opening,routeVersion: 'route-v1',topologyVersion: version }));
  const creep = { id: 'native-id',name: 'paid-courier',store: { energy: 32 },fatigue: 0,memory: { population: { home: 'W0N1',owner: 'paid-owner' } } } as Creep;
  const command = { owner: 'task-owner',destination: f.point(10),range: 0,policy: { version: 'route',blockedRooms: [],costs: {},maximumRooms: 1 } };
  return { ...f,root,state,follow,movement,control,creep,command,at(value: number,x: number) { tick = value; f.opening.observed.observedAt = value; f.opening.observed.position = f.point(x); f.opening.continuation.readyAt = value; },topology(value: string) { version = value; } };
}
