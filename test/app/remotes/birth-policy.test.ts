import { afterEach, expect, test, vi } from 'vitest';
import { startupFixture } from '../../fixtures/remote-startup';
import { createRemoteProfileRecruitment } from '../../../src/app/remotes/fleet/recruitment-profile';
import { createSpawnQueue } from '../../../src/features/population/spawn-queue';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
import type { RemoteFleetBirthPolicy } from '../../../src/app/remotes/startup/model';
afterEach(() => vi.unstubAllGlobals());
function fixture(policy?: RemoteFleetBirthPolicy) {
  const f = startupFixture(); const dispatch = { structures: { cancelSpawning: vi.fn() } } as unknown as ReturnType<typeof createNativeDispatch>;
  const reconcile = createRemoteProfileRecruitment(f.state,dispatch,policy), queue = createSpawnQueue(f.state,'W0N1');
  const config = { ...f.config,remoteSpawnRequestLifetime: 100 };
  return { ...f,dispatch,reconcile,queue,config };
}
const placement = { spawn: 'chosen',exit: { room: 'W0N1',x: 24,y: 25 } };
test('ordinary profile recruitment binds prepared placement and cancels only conflicting owned queued requests',() => {
  const f = fixture({ current: () => placement });
  f.queue.submit({ id: 'old',name: 'old',owner: f.miner.owner,room: 'W0N1',body: f.miner.body,priority: 1,readyAt: 1,expiresAt: 100 });
  f.queue.submit({ id: 'unrelated',name: 'unrelated',owner: 'other',room: 'W0N1',body: ['move'],priority: 1,readyAt: 1,expiresAt: 100 });
  expect(f.reconcile(f.miner,1,[],f.config,() => true)).toBe(true);
  expect(f.queue.list().map(request => request.id)).not.toContain('old'); expect(f.queue.list().find(request => request.owner === f.miner.owner)?.placement).toEqual(placement);
  expect(f.queue.list().find(request => request.id === 'unrelated')).toBeDefined();
});
test('planning deferral clears unstarted demand without canceling already-paid spawning bodies',() => {
  const f = fixture({ current: () => null }), creep = f.activeMiner(true); f.game.creeps.miner = creep;
  vi.stubGlobal('Game',{ ...f.game,spawns: { paid: { room: { name: 'W0N1' },spawning: { name: 'miner' } } } });
  f.queue.submit({ id: 'queued',name: 'queued',owner: f.miner.owner,room: 'W0N1',body: f.miner.body,priority: 1,readyAt: 1,expiresAt: 100 });
  f.reconcile(f.miner,1,[{ name: 'miner',owner: f.miner.owner,room: 'W0N1',spawning: true,ticksToLive: 0 }],f.config,() => true);
  expect(f.queue.list()).toEqual([]); expect(f.dispatch.structures.cancelSpawning).not.toHaveBeenCalled();
});
test('guard exhaustion after preparation cannot publish a request, even if preparation returned a placement',() => {
  let available = true; const f = fixture({ current: () => placement,prepare: () => { available = false; return placement; } });
  expect(f.reconcile(f.miner,1,[],f.config,() => available)).toBe(false); expect(f.state.read('spawning/W0N1')).toBeUndefined();
});
test('absence of selected planning retains ordinary unbound demand',() => {
  const f = fixture(); f.reconcile(f.miner,1,[],f.config,() => true); expect(f.queue.list()[0]!.placement).toBeUndefined();
});

test('cohort metadata is published through common demand and survives loss of its selection policy',() => {
  const marker = { kind: 'remote-startup' as const,generation: 1,observedAt: 1 }, f = fixture({ current: () => placement,cohort: () => marker });
  f.reconcile(f.miner,1,[],f.config,() => true);
  const original = f.queue.list()[0]!; expect(original.admission).toEqual(marker);
  createRemoteProfileRecruitment(f.state,f.dispatch)(f.miner,1,[],f.config,() => true);
  expect(f.queue.list()).toEqual([original]);
});
