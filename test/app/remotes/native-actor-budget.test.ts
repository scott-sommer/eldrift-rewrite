import { afterEach, expect, test, vi } from 'vitest';
import { startupFixture } from '../../fixtures/remote-startup';
import { createNativeRemoteActors } from '../../../src/app/remotes/fleet/actors';
import { createRemoteActorCursor } from '../../../src/features/remotes/fleet/actor-cursor';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
const activity = vi.hoisted(() => ({ cpu: 0,visited: [] as string[],target: 'c',checkGuard: true }));
vi.mock('../../../src/app/remotes/native-transport-cycle',() => ({ createNativeRemoteTransportCycle: (_state: unknown,_dispatch: unknown,_binding: unknown,options: { guard(): boolean }) => ({ run(creep: { name: string }) {
  activity.visited.push(creep.name); if (creep.name === activity.target) { activity.cpu = 6; if (activity.checkGuard) options.guard(); }
} }) }));
vi.mock('../../../src/app/remotes/native-mining-cycle',() => ({ createNativeRemoteMiningCycle: () => ({ run: () => {} }) }));
afterEach(() => { vi.unstubAllGlobals(); activity.cpu = 0; activity.visited = []; activity.target = 'c'; activity.checkGuard = true; });
function fixture() {
  const f = startupFixture(), creeps = Object.fromEntries(['a','b','c'].map(name => [name,{ name,id: name,my: true,spawning: false,ticksToLive: 1000,memory: { population: { owner: f.courier.owner,home: 'W0N1' } },getActiveBodyparts: () => 4 }]));
  const game = { ...f.game,creeps,cpu: { getUsed: () => activity.cpu,tickLimit: 500 } }; vi.stubGlobal('Game',game);
  const config = { ...f.config,remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteWorkerCpuBudget: 5 };
  const actors = createNativeRemoteActors(f.state,{} as ReturnType<typeof createNativeDispatch>,() => config,{});
  const context = { config: { values: config },rooms: new Map([['W0N1',{ values: config }]]) } as unknown as Parameters<typeof actors.run>[0];
  const cursor = createRemoteActorCursor(f.state,'W0N1'); cursor.save('a');
  return { ...f,game,cursor,run: () => actors.run(context) };
}
test('a budget-deferred actor keeps the next cursor turn instead of being counted as serviced',() => {
  const f = fixture(); f.run(); expect(activity.visited).toEqual(['b','c']); expect(f.cursor.order([{ name: 'a' },{ name: 'b' },{ name: 'c' }])[0]!.name).toBe('c');
  activity.cpu = 0; activity.visited = []; activity.target = ''; f.game.time = 2; f.run(); expect(activity.visited).toEqual(['c','a','b']);
});
test('a completed atomic actor step keeps its turn credit even if time expires after its last admission check',() => {
  const f = fixture(); activity.checkGuard = false; f.run();
  expect(activity.visited).toEqual(['b','c']); expect(f.cursor.order([{ name: 'a' },{ name: 'b' },{ name: 'c' }])[0]!.name).toBe('a');
});
