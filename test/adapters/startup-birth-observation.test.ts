import { afterEach, expect, test, vi } from 'vitest';
import { observeStartupBirths } from '../../src/adapters/screeps/startup-birth-observation';
afterEach(() => vi.unstubAllGlobals());
test('native incubation and active TTL independently recover the exact paid clock; changed actors refuse',() => {
  const request = { id: 'birth',name: 'miner',owner: 'owner',room: 'W0N1',body: ['work','carry','move'] as const,priority: 0,readyAt: 1,expiresAt: 100 };
  const creep = { name: 'miner',my: true,spawning: true,memory: { population: { owner: 'owner',home: 'W0N1' } },body: request.body.map(type => ({ type,hits: 100 })),ticksToLive: 1499 };
  vi.stubGlobal('CREEP_SPAWN_TIME',3); vi.stubGlobal('Game',{ time: 5,creeps: { miner: creep },spawns: { Spawn1: { spawning: { name: 'miner',needTime: 9,remainingTime: 5 } } } });
  expect(observeStartupBirths([request])[0]).toMatchObject({ startAt: 1,activeAt: 10,owner: 'owner',home: 'W0N1' });
  Game.time = 10; creep.spawning = false; expect(observeStartupBirths([request])[0]).toMatchObject({ startAt: 1,activeAt: 10 });
  creep.body[0]!.hits = 99; expect(observeStartupBirths([request])).toEqual([]); creep.body[0]!.hits = 100;
  creep.my = false; expect(observeStartupBirths([request])).toEqual([]);
});
