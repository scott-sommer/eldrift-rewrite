import { afterEach, expect, test, vi } from 'vitest';
import { startupFactsFixture } from '../../fixtures/native-startup-facts';
import { startupPosition } from '../../fixtures/remote-startup';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
afterEach(() => vi.unstubAllGlobals());
test('current source, exact station, endpoint, stock and spawn observations are detached and read only',() => {
  const f = startupFactsFixture(), before = JSON.stringify(f.root);
  f.sites.push({ id: 'site',my: true,structureType: 'container',pos: startupPosition(5,24),progress: 123,total: 5000,progressTotal: 5000 });
  const result = f.observe(f.request); expect(result.status).toBe('observed'); if (result.status !== 'observed') return;
  expect(result.facts).toMatchObject({ observedAt: 1,source: { id: 'source',energy: 1500,capacity: 1500,regenerationIn: null },
    station: { x: 5,y: 24,facts: { status: 'building',remainingProgress: 4877 } },endpoint: { id: 'bank',energy: 700,capacity: 1000,freeCapacity: 300 },
    stock: { totalEnergy: 1000,availableEnergy: 1000,spawnEnergy: 300,spawnCapacity: 1300 },spawns: [{ id: 'spawn',remainingTime: 12 }],authority: { generation: 1 } });
  f.source.energy = 42; f.endpoint.store.energy = 2; f.request.station.x = 4;
  expect(result.facts.source.energy).toBe(1500); expect(result.facts.endpoint.energy).toBe(700); expect(result.facts.station.x).toBe(5);
  expect(JSON.stringify(f.root)).toBe(before); expect(JSON.parse(JSON.stringify(result))).toEqual(result);
});
test('a different adjacent container cannot hide planned construction; ready stock is observed explicitly',() => {
  const f = startupFactsFixture();
  const container = { id: 'container',structureType: 'container',pos: startupPosition(7,25),hits: 12345,hitsMax: 250000,ticksToDecay: 52,
    store: { energy: 321,getCapacity: () => 2000 } };
  f.structures.push(container);
  expect(f.observe(f.request)).toMatchObject({ facts: { station: { facts: { status: 'missing',remainingProgress: 5000 } } } });
  container.pos = startupPosition(5,24);
  expect(f.observe(f.request)).toMatchObject({ facts: { station: { facts: { status: 'ready',energy: 321,capacity: 2000,hits: 12345,ticksToDecay: 52 } } } });
});
test('existing active stock claims are subtracted once and expired claims are not retained as liabilities',() => {
  const f = startupFactsFixture();
  f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'claim',owner: 'haul',holder: 'worker',scope: 'transfer',expiresAt: 2,allocations: [{ pool: logisticsPool('stock','bank','energy'),amount: 100 }] }] } });
  const before = JSON.stringify(f.root);
  expect(f.observe(f.request)).toMatchObject({ facts: { stock: { totalEnergy: 1000,claimedEnergy: 100,availableEnergy: 900 } } });
  f.game.time = 2; f.request.tick = 2;
  expect(f.observe(f.request)).toMatchObject({ facts: { stock: { claimedEnergy: 0,availableEnergy: 1000 } } });
  expect(JSON.stringify(f.root)).toBe(before);
});
test('room workforce includes paid and damaged cohorts without importing free labor into a forecast',() => {
  const f = startupFactsFixture(), miner = f.activeMiner(); miner.body[0]!.hits = 50; miner.body[0]!.boost = 'UO';
  f.game.creeps.worker = miner;
  const result = f.observe(f.request); expect(result.status).toBe('observed'); if (result.status !== 'observed') return;
  expect(result.facts.workers[0]).toMatchObject({ name: 'miner',owner: f.miner.owner,ticksToLive: 1400 });
  expect(result.facts.workers[0]!.body[0]).toEqual({ type: 'work',hits: 50,boost: 'UO' });
  miner.body[0]!.hits = 0; expect(result.facts.workers[0]!.body[0]!.hits).toBe(50);
  expect(f.observe(f.request,() => false)).toEqual({ status: 'deferred',reason: 'budget' });
});
test('lost home, vision, hostile reservation, stale tick and assignment loss cannot yield usable facts',() => {
  const f = startupFactsFixture(); f.home.controller.my = false;
  expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'home-unavailable' }); f.home.controller.my = true;
  delete f.game.rooms.E0N1; expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'vision' }); f.game.rooms.E0N1 = f.remote;
  f.remote.controller.reservation = { username: 'enemy',ticksToEnd: 100 }; expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'unsafe-room' });
  f.remote.controller.reservation = undefined; f.request.source = 'unleased'; expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'assignment' });
  f.request.tick = 0; expect(() => f.observe(f.request)).toThrow('tick mismatch');
});
test('wrong-room endpoints and blocked or nonadjacent station tiles cannot be quoted',() => {
  const f = startupFactsFixture(); f.endpoint.pos = startupPosition(25,25,'E0N1');
  expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'station-or-endpoint' }); f.endpoint.pos = startupPosition(25,25,'W0N1');
  f.structures.push({ structureType: 'spawn',pos: startupPosition(5,24) }); expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'station-or-endpoint' });
  f.request.station.x = 25; expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'source' });
});

test('observation does not require a lease but preserves foreign ownership and room safety exclusions',() => {
  const f = startupFactsFixture(); f.assignments.reconcile({ home: 'W0N1',tick: 1,lifetime: 100,expectedRevision: 1,plans: [] });
  expect(f.observe(f.request)).toMatchObject({ status: 'observed',facts: { authority: null } });
  f.assignments.reconcile({ home: 'W1N1',tick: 1,lifetime: 100,expectedRevision: 2,plans: [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null }] });
  expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'assignment' });
  f.remote.controller.owner = { username: 'enemy' }; expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'unsafe-room' });
});
test('unknown source, nonwalkable terrain and hostile worksite ownership remain explicit refusals',() => {
  const f = startupFactsFixture(), find = f.remote.find; f.remote.find = () => [];
  expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'source' });
  f.remote.find = find;
  f.remote.getTerrain = () => ({ get: () => 1 }); expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'station-or-endpoint' });
  f.remote.getTerrain = () => ({ get: () => 0 });
  f.sites.push({ structureType: 'container',my: false,pos: startupPosition(5,24) });
  expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'station-or-endpoint' });
});

test('container stock and shared endpoint capacity claims are observed, not reused as free resources',() => {
  const f = startupFactsFixture();
  f.structures.push({ id: 'container',structureType: 'container',pos: startupPosition(5,24),hits: 100000,hitsMax: 250000,ticksToDecay: 23,store: { energy: 90,getCapacity: () => 2000 } });
  f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'flow',owner: 'haul',holder: 'worker',scope: 'transfer',expiresAt: 2,allocations: [
    { pool: logisticsPool('stock','container','energy'),amount: 40 },{ pool: logisticsPool('capacity','bank'),amount: 100 }] }] } });
  expect(f.observe(f.request)).toMatchObject({ facts: { stock: { availableEnergy: 1000 },station: { facts: { energy: 90,claimedEnergy: 40,availableEnergy: 50 } },endpoint: { freeCapacity: 300,claimedCapacity: 100,availableCapacity: 200 } } });
  f.endpoint.isActive = () => false;
  expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'station-or-endpoint' });
});

test('budget exhaustion during workforce capture returns no partial snapshot and over-capacity cohorts defer',() => {
  const f = startupFactsFixture(); f.game.creeps.miner = f.activeMiner(); let calls = 0;
  expect(f.observe(f.request,() => ++calls < 2)).toMatchObject({ status: 'deferred',reason: 'budget-or-workforce-capacity' });
  for (let n = 0; n < 129; n++) f.game.creeps['worker'+n] = f.activeMiner();
  expect(f.observe(f.request)).toMatchObject({ status: 'deferred',reason: 'budget-or-workforce-capacity' });
});
