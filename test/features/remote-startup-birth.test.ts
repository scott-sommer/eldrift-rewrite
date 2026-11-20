import { expect, test } from 'vitest';
import { bindStartupBirth } from '../../src/features/remotes/startup/birth';
import { startupTravelPlan } from '../fixtures/startup-travel';
import { forecastStartupSpawns } from '../../src/capabilities/economy/startup/spawns';
import { createStartupSpawnTimeline } from '../../src/capabilities/economy/startup/spawn-timeline';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
const base = (): SpawnRequest => ({ id: 'miner',name: 'miner',owner: 'remote',room: 'W0N1',priority: 0,readyAt: 0,expiresAt: 20,body: startupTravelPlan().miner });
test('birth binding retains identity/ownership and enforces the quoted ordered body and physical production room',() => {
  const plan = startupTravelPlan(), request = bindStartupBirth(base(),plan,'miner');
  expect(request).toMatchObject({ id: 'miner',owner: 'remote',placement: { spawn: 'spawn',exit: { x: 46,y: 25 } } });
  plan.spawn.exit.x = 1; expect(request.placement!.exit.x).toBe(46);
  expect(() => bindStartupBirth({ ...base(),body: ['move'] },startupTravelPlan(),'miner')).toThrow('mismatch');
  expect(() => bindStartupBirth({ ...base(),room: 'E0N1' },startupTravelPlan(),'miner')).toThrow('mismatch');
});
test('an existing different binding cannot be overwritten; equivalent property ordering is harmless',() => {
  const plan = startupTravelPlan(), request = base(); request.placement = { exit: { y: 25,x: 46,room: 'W0N1' },spawn: 'spawn' };
  expect(bindStartupBirth(request,plan,'miner').placement!.spawn).toBe('spawn'); request.placement.spawn = 'other';
  expect(() => bindStartupBirth(request,plan,'miner')).toThrow('already bound');
});
test('the forward spawn timeline honors selected-spawn availability and snapshots nested exit data',() => {
  const request = bindStartupBirth(base(),startupTravelPlan(),'miner');
  const input = { room: 'W0N1',requests: [request],spawns: [{ id: 'a',room: 'W0N1',availableAt: 0 },{ id: 'spawn',room: 'W0N1',availableAt: 5 }],liveNames: new Set<string>(),unaffordable: 'skip' as const,
    cash: { homeEnergy: 1000,protectedEnergy: 0,horizon: 10,readyAt: 0,selfHarvestedConstruction: 0,flows: [] },funding: { capacity: 1000,initialEnergy: 1000,refills: [] } };
  const expected = forecastStartupSpawns(input), timeline = createStartupSpawnTimeline(input);
  request.placement!.spawn = 'a'; request.placement!.exit.x = 0;
  for (let tick = 0; tick <= 10; tick++) { timeline.begin(tick); timeline.finish(); }
  expect(timeline.result()).toEqual(expected); expect(expected.births[0]).toMatchObject({ spawn: 'spawn',startAt: 5 });
});
