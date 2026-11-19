import { afterEach, expect, test, vi } from 'vitest';
import { reservationManagementFixture } from '../../fixtures/reservation-management';
import { createNativeReservationCycle } from '../../../src/app/remotes/reservation/cycle';
import { createNativeReservationService } from '../../../src/app/remotes/native-reservation-service';
import { openState, saveState } from '../../../src/persistence/versioned-state';
import { taskSchema } from '../../../src/persistence/tasks/schema';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
import type { NativeRemoteOptions } from '../../../src/app/remotes/native-movement';
import { validRemoteTaskPayload } from '../../../src/app/remotes/task';
vi.mock('../../../src/app/remotes/native-reservation-service',() => ({ createNativeReservationService: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function fixture() {
  const f = reservationManagementFixture(); vi.stubGlobal('Game',{ time: 20 });
  const service = { clock: () => Game.time,unit: (creep: Creep) => creep.name,service: vi.fn(() => ({ status: 'running' as const })),retire: vi.fn(() => ({ status: 'running' as const })) };
  vi.mocked(createNativeReservationService).mockReturnValue(service);
  const binding = { home: 'W0N1',owner: f.plan.owner }, creep = { name: 'reserver',my: true,spawning: false,ticksToLive: 500,memory: { population: binding } } as Creep;
  const definitions = { reserve: { phases: ['work'],validPayload: validRemoteTaskPayload },foreign: { phases: ['work'],validPayload: () => true } };
  const schema = taskSchema(creep.name,definitions), read = () => openState(f.state,'tasks/reserver',schema);
  const run = (active = true) => createNativeReservationCycle(f.state,{} as ReturnType<typeof createNativeDispatch>,binding,{} as NativeRemoteOptions,definitions).run(creep,active ? f.plan.demand : undefined);
  return { ...f,binding,creep,service,schema,read,run };
}
test('reservation service uses stable shared tasks and scoped withdrawal cleans only owned work',() => {
  const f = fixture(); f.run(); const id = f.read().queue[0]!.id; Game.time++; f.run();
  expect(f.read().queue[0]!.id).toBe(id); expect(f.service.service).toHaveBeenCalledTimes(2);
  f.run(false); expect(f.read().queue).toHaveLength(0); expect(f.service.retire).toHaveBeenCalled();
});
test('foreign tasks and population ownership are preserved without controller work',() => {
  const f = fixture(), tasks = f.read(); tasks.queue.push({ id: 'foreign',kind: 'foreign',phase: 'work',payload: {},wakeAt: 1,retries: 0,expiresAt: 100 });
  saveState(f.state,'tasks/reserver',f.schema,tasks); f.run(); f.run(false);
  expect(f.read()).toEqual(tasks); expect(f.service.service).not.toHaveBeenCalled(); expect(f.service.retire).not.toHaveBeenCalled();
  f.creep.memory.population = { home: 'W0N1',owner: 'other' }; f.run(); expect(f.service.service).not.toHaveBeenCalled();
});
