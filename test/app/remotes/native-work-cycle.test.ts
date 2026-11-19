import { afterEach, expect, test, vi } from 'vitest';
import { infrastructureFixture } from '../../fixtures/remote-infrastructure';
import { createNativeRemoteWorkCycle } from '../../../src/app/remotes/infrastructure/work-cycle';
import { createNativeRemoteOutpostService } from '../../../src/app/remotes/infrastructure/outpost-service';
import { createNativeRemoteBanking } from '../../../src/app/remotes/native-banking';
import { openState, saveState } from '../../../src/persistence/versioned-state';
import { taskSchema } from '../../../src/persistence/tasks/schema';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
import type { NativeRemoteOptions } from '../../../src/app/remotes/native-movement';
vi.mock('../../../src/app/remotes/infrastructure/outpost-service',() => ({ createNativeRemoteOutpostService: vi.fn() }));
vi.mock('../../../src/app/remotes/native-banking',() => ({ createNativeRemoteBanking: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function fixture() {
  const f = infrastructureFixture(); vi.stubGlobal('Game',{ time: 2 });
  const service = { clock: () => Game.time,unit: (creep: Creep) => creep.name,available: vi.fn(() => true),service: vi.fn(() => ({ status: 'running' as const })),retire: vi.fn(() => ({ status: 'running' as const })) };
  vi.mocked(createNativeRemoteOutpostService).mockReturnValue(service);
  const bank = { definitions: { haul: { phases: ['work'],validPayload: (value: unknown): value is unknown => value !== undefined,handlers: () => ({ work: () => ({ status: 'running' as const }) }) } },owns: () => true,prepare: vi.fn(() => 'service' as 'service' | 'bank' | 'hold') };
  vi.mocked(createNativeRemoteBanking).mockReturnValue(bank);
  const binding = { home: 'W0N1',owner: 'outpost-builder' };
  const creep = { id: 'builder-id',name: 'builder',my: true,spawning: false,ticksToLive: 500,memory: { population: binding },pos: { roomName: 'W0N1' },store: { energy: 50,getUsedCapacity: () => 50 } } as unknown as Creep;
  let admitted = true;
  const dispatch = { activate: vi.fn() } as unknown as ReturnType<typeof createNativeDispatch>;
  const options = { guard: () => admitted } as NativeRemoteOptions;
  const make = () => createNativeRemoteWorkCycle(f.state,dispatch,binding,options,{ collect: () => ({ status: 'running' }) },{ foreign: { phases: ['work'],validPayload: () => true } });
  const cycle = make(), schema = taskSchema(creep.name,cycle.definitions);
  const read = () => openState(f.state,'tasks/'+creep.name,schema).queue;
  const queue = (kind: string) => { const record = openState(f.state,'tasks/'+creep.name,schema); record.queue = [{ id: 'other',kind,phase: 'work',payload: {},wakeAt: 1,retries: 0,expiresAt: 100 }]; saveState(f.state,'tasks/'+creep.name,schema,record); };
  return { ...f,creep,service,bank,cycle,make,read,queue,pause: () => { admitted = false; } };
}
test('active loaded builders leave home for work rather than banking their construction supply',() => {
  const f = fixture(); f.cycle.run(f.creep,f.demand);
  expect(f.bank.prepare).not.toHaveBeenCalled(); expect(f.service.service).toHaveBeenCalledTimes(1);
  const id = f.read()[0]!.id; Game.time = 3; f.make().run(f.creep,f.demand);
  expect(f.read()[0]!.id).toBe(id); expect(f.service.service).toHaveBeenCalledTimes(2);
});
test('withdrawal cancels only construction work and retires with cargo through the banking boundary',() => {
  const f = fixture(); f.cycle.run(f.creep,f.demand); Game.time = 3; f.cycle.run(f.creep);
  expect(f.read()).toHaveLength(0); expect(f.bank.prepare).toHaveBeenCalled(); expect(f.service.retire).toHaveBeenCalledWith(f.creep,'W0N1','remote-work-return:builder');
});
test('completed or unsafe work follows the same retirement path',() => {
  const f = fixture(); f.service.available.mockReturnValue(false); f.cycle.run(f.creep,f.demand);
  expect(f.service.service).not.toHaveBeenCalled(); expect(f.bank.prepare).toHaveBeenCalled();
});
test('foreign tasks and population ownership survive construction reconciliation',() => {
  const f = fixture(); f.queue('foreign'); const before = structuredClone(f.read()); f.cycle.run(f.creep,f.demand); f.cycle.run(f.creep);
  expect(f.read()).toEqual(before); expect(f.bank.prepare).not.toHaveBeenCalled();
  f.creep.memory.population!.owner = 'someone-else'; f.cycle.run(f.creep,f.demand); expect(f.service.service).not.toHaveBeenCalled();
});
test('existing banking precedes optional CPU admission while new work remains deferred',() => {
  const f = fixture(); f.queue('haul'); f.bank.prepare.mockReturnValue('hold'); f.pause(); f.cycle.run(f.creep,f.demand);
  expect(f.bank.prepare).toHaveBeenCalledTimes(1); expect(f.service.service).not.toHaveBeenCalled(); expect(f.read()[0]!.kind).toBe('haul');
});
