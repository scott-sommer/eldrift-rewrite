import { afterEach, expect, test, vi } from 'vitest';
import { startupProjectionFixture } from '../../fixtures/native-startup-projection';
import { forecastStartupProject } from '../../../src/capabilities/economy/startup/project';
import { createSpawnQueue } from '../../../src/features/population/spawn-queue';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { startupPosition } from '../../fixtures/remote-startup';
afterEach(() => vi.unstubAllGlobals());
test('maps exact body/service legs, native source phase, physical funding and busy spawn slots without writes',() => {
  const f = startupProjectionFixture(), before = JSON.stringify(f.root), result = f.convert(f.quote,f.options);
  expect(result.status).toBe('ready'); if (result.status !== 'ready') return;
  expect(result).toMatchObject({ observedAt: 1,costScope: 'prospective',input: { containerCapacity: 2000,
    project: { remainingProgress: 5000,source: { energy: 1500,capacity: 1500,regenerationTicks: 300,regenerationIn: null },workers: [{ travelTicks: 10,retireTicks: 40 }],
      spawning: { funding: { capacity: 1300,initialEnergy: 1300,refills: [] },cash: { homeEnergy: 2000,protectedEnergy: 350,selfHarvestedConstruction: 5000,flows: [] },spawns: [{ id: 'spawn',availableAt: 12 }] } },
    couriers: [{ initialOutboundTicks: 12,outboundTicks: 15,returnTicks: 16,collectionTicks: 1,deliveryTicks: 1 }],container: { hits: 250000,decayIn: 99,decayInterval: 99 },homeSink: { freeCapacity: 300,capacity: 1000 } } });
  expect(result.input.project.spawning.requests.every(request => request.placement?.spawn === 'spawn' && request.placement.exit.x === 23)).toBe(true);
  const forecast = forecastStartupProject(result.input); expect(forecast.spawning.births[0]).toMatchObject({ request: 'future-miner',startAt: 12,activeAt: 33,cost: 550 });
  expect(JSON.stringify(f.root)).toBe(before); f.options.births[0]!.request.body = ['move']; f.quote.facts.source.energy = 0;
  expect(result.input.project.source.energy).toBe(1500); expect(result.input.project.spawning.requests[0]!.body).toHaveLength(7);
});
test('spawn-pool claims cannot be spent merely because unclaimed bank energy exists',() => {
  const f = startupProjectionFixture(); f.home.energyAvailable = 300;
  f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'claim',owner: 'haul',holder: 'worker',scope: 'transfer',expiresAt: 2,allocations: [
    { pool: logisticsPool('stock','spawn','energy'),amount: 250 },{ pool: logisticsPool('stock','bank','energy'),amount: 100 }] }] } });
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts = observed.facts;
  expect(f.quote.facts.stock).toMatchObject({ totalEnergy: 1000,claimedEnergy: 350,availableEnergy: 650,spawnEnergy: 300,claimedSpawnEnergy: 250,availableSpawnEnergy: 50 });
  const result = f.convert(f.quote,f.options); expect(result.status).toBe('ready'); if (result.status !== 'ready') return;
  expect(result.input.project.spawning.funding.initialEnergy).toBe(50); const forecast = forecastStartupProject(result.input);
  expect(forecast.spawning.births).toEqual([]); expect(forecast.delivery.deliveredEnergy).toBe(0);
});
test('actual queued home births consume funding/spawn time while future and expired requests are excluded',() => {
  const f = startupProjectionFixture(), queue = createSpawnQueue(f.state,f.request.home);
  const base = { id: 'home-birth',name: 'home-birth',owner: 'home',room: f.request.home,body: ['move'] as const,priority: 0,readyAt: 1,expiresAt: 100 };
  queue.submit(base); queue.submit({ ...base,id: 'future',name: 'future',readyAt: 2000,expiresAt: 3000 }); queue.submit({ ...base,id: 'expired',name: 'expired',readyAt: 0,expiresAt: 1 });
  const before = JSON.stringify(f.root), result = f.convert(f.quote,f.options); if (result.status !== 'ready') throw new Error(result.reason);
  expect(result.input.project.spawning.requests.map(request => request.id)).toEqual(['future-miner','future-courier','home-birth']);
  const forecast = forecastStartupProject(result.input); expect(forecast.spawning.births.slice(0,2)).toMatchObject([{ request: 'home-birth',startAt: 12,cost: 50 },{ request: 'future-miner',startAt: 15 }]);
  expect(JSON.stringify(f.root)).toBe(before);
});
test('queued source workforce and mismatched same-ID requests remain explicit deferrals',() => {
  const f = startupProjectionFixture(), queue = createSpawnQueue(f.state,f.request.home), proposal = f.options.births[0]!.request;
  queue.submit({ ...proposal,id: 'queued-miner',name: 'queued-miner',readyAt: 1,expiresAt: 1502 });
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'queued-workforce' }); queue.cancel('queued-miner',proposal.owner);
  queue.submit({ ...proposal,priority: 999,readyAt: 1,expiresAt: 1502 }); expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'queue-collision' });
});
test('a represented queued birth is charged once and requires matching selected placement when already bound',() => {
  const f = startupProjectionFixture(), queue = createSpawnQueue(f.state,f.request.home), proposal = f.options.births[0]!.request;
  queue.submit({ ...proposal,readyAt: 1,expiresAt: 1502 }); const result = f.convert(f.quote,f.options); if (result.status !== 'ready') throw new Error(result.reason);
  expect(result.input.project.spawning.requests).toHaveLength(2); queue.cancel(proposal.id,proposal.owner);
  queue.submit({ ...proposal,readyAt: 1,expiresAt: 1502,placement: { spawn: 'elsewhere',exit: { room: f.request.home,x: 1,y: 1 } } });
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'queue-collision' });
});
test('current workers and claimed/stored station energy are not discarded or imported as free labor/income',() => {
  const f = startupProjectionFixture(); f.quote.facts.workers.push({ name: 'paid',owner: f.miner.owner,position: { room: 'E0N1',x: 5,y: 24 },spawning: true,ticksToLive: null,energy: 0,body: [] });
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' }); f.quote.facts.workers = [];
  f.structures.push({ id: 'container',structureType: 'container',pos: startupPosition(5,24),hits: 12345,hitsMax: 250000,ticksToDecay: 52,store: { energy: 50,getCapacity: () => 2000 } });
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts = observed.facts;
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'station-stock' });
});
test('empty existing containers preserve actual durability phase and endpoint capacity claims',() => {
  const f = startupProjectionFixture(); f.structures.push({ id: 'container',structureType: 'container',pos: startupPosition(5,24),hits: 12345,hitsMax: 250000,ticksToDecay: 52,store: { energy: 0,getCapacity: () => 2000 } });
  f.quote.facts.endpoint.availableCapacity = 100;
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts.station = observed.facts.station;
  const result = f.convert(f.quote,f.options); if (result.status !== 'ready') throw new Error(result.reason);
  expect(result.input.container).toMatchObject({ hits: 12345,decayIn: 52 }); expect(result.input.project.remainingProgress).toBe(0); expect(result.input.homeSink.freeCapacity).toBe(100);
});
test('stale observation, mismatched facts/legs and known reservation expiry cannot create a projection',() => {
  const f = startupProjectionFixture(); f.quote.observedAt = 0; expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'stale-observation' }); f.quote.observedAt = 1;
  f.quote.facts.endpoint.id = 'other'; expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'quote-facts' }); f.quote.facts.endpoint.id = 'bank';
  f.quote.facts.reservation = { username: 'me',ticksToEnd: 1501 }; expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'reservation-transition' });
});
test('retirement must cover measured loaded return plus deposit and budget refusal publishes nothing',() => {
  const f = startupProjectionFixture(), before = JSON.stringify(f.root); expect(f.convert(f.quote,f.options,() => false)).toEqual({ status: 'deferred',reason: 'budget' });
  f.options.births[0]!.retireTicks = 20; expect(() => f.convert(f.quote,f.options)).toThrow('retirement'); expect(JSON.stringify(f.root)).toBe(before);
});
