import { remoteFleetOwner } from '../../../src/features/remotes/fleet/identity';
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
  const f = startupProjectionFixture(); f.quote.facts.workers.push({ name: 'paid',owner: f.miner.owner,position: { room: 'E0N1',x: 5,y: 24 },spawning: true,ticksToLive: null,energy: 0,fatigue: 0,usedCapacity: 0,body: [] });
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' }); f.quote.facts.workers = [];
  f.structures.push({ id: 'container',structureType: 'container',pos: startupPosition(5,24),hits: 12345,hitsMax: 250000,ticksToDecay: 52,store: { energy: 50,getCapacity: () => 2000 } });
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts = observed.facts;
  expect(f.convert(f.quote,f.options)).toMatchObject({ status: 'ready',input: { initial: { containerEnergy: 50 },project: { spawning: { cash: { openingAssets: 50 } } } } });
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

test('an observed paid station miner retains its actual life/cargo and requires no new birth',() => {
  const f = startupProjectionFixture(); f.game.creeps.worker = f.activeMiner(); f.game.creeps.worker!.store.energy = 8;
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts = observed.facts; f.options.births = [];
  const result = f.convert(f.quote,f.options); if (result.status !== 'ready') throw new Error(result.reason);
  expect(result.input.initial?.miner).toMatchObject({ id: 'miner',expiresAt: 1400,availableAt: 0,energy: 8,retireTicks: 30 });
  const forecast = forecastStartupProject(result.input); expect(forecast.spawning.births).toEqual([]); expect(forecast.cash.birthEnergy).toBe(0);
  expect(forecast.openingAssets?.energy).toBe(8);
});
test('claimed station stock remains occupied and cannot fund another cohort or invent free container space',() => {
  const f = startupProjectionFixture(); f.structures.push({ id: 'container',structureType: 'container',pos: startupPosition(5,24),hits: 250000,hitsMax: 250000,ticksToDecay: 99,store: { energy: 90,getCapacity: () => 2000 } });
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts = observed.facts;
  const station = f.quote.facts.station.facts; if (station.status !== 'ready') throw new Error('Expected ready stock'); station.claimedEnergy = 40; station.availableEnergy = 50;
  const result = f.convert(f.quote,f.options); if (result.status !== 'ready') throw new Error(result.reason);
  expect(result.input.initial?.containerEnergy).toBe(50); expect(result.input.containerCapacity).toBe(1960); expect(result.input.project.spawning.cash.openingAssets).toBe(50);
});

test('damaged, boosted or off-station current miners defer rather than inheriting healthy quoted powers or travel',() => {
  const f = startupProjectionFixture(); f.game.creeps.worker = f.activeMiner(); const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts');
  f.quote.facts = observed.facts; f.options.births = []; const worker = f.quote.facts.workers[0]!;
  worker.body[0]!.hits = 50; expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' });
  worker.body[0]!.hits = 100; worker.body[0]!.boost = 'UO'; expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' });
  worker.body[0]!.boost = null; worker.position.x = 3; expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' });
});
test('healthy endpoint couriers retain actual phase/cargo and require an explicit collection policy',() => {
  const f = startupProjectionFixture(), worker = f.activeMiner();
  Object.assign(worker,{ name: 'paid-courier',body: f.courier.body.map(type => ({ type,hits: 100 })),memory: { population: { home: f.request.home,owner: f.courier.owner } },pos: startupPosition(4,24),ticksToLive: 100 });
  f.game.creeps.courier = worker; let observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts = observed.facts; f.options.births = [];
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' }); f.options.incumbentMinimumBatch = 25;
  expect(f.convert(f.quote,f.options)).toMatchObject({ status: 'ready',input: { initial: { couriers: [{ id: 'paid-courier',expiresAt: 100,availableAt: 0,phase: 'collect',energy: 0,minimumBatch: 25 }] } } });
  Object.assign(worker,{ pos: startupPosition(26,25,f.request.home) }); worker.store.energy = 50; observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts'); f.quote.facts = observed.facts;
  const result = f.convert(f.quote,f.options); if (result.status !== 'ready') throw new Error(result.reason);
  expect(result.input.initial?.couriers[0]).toMatchObject({ phase: 'deliver',energy: 50,availableAt: 0 });
  expect(forecastStartupProject(result.input).cash.birthEnergy).toBe(0);
});

test('mixed non-energy cargo cannot be treated as empty carrying capacity',() => {
  const f = startupProjectionFixture(), worker = f.activeMiner();
  Object.assign(worker,{ name: 'mixed-courier',body: f.courier.body.map(type => ({ type,hits: 100 })),memory: { population: { home: f.request.home,owner: f.courier.owner } },pos: startupPosition(4,24),ticksToLive: 100 });
  Object.assign(worker.store,{ getUsedCapacity: () => 50 }); f.game.creeps.courier = worker;
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected facts');
  f.quote.facts = observed.facts; f.options.births = []; f.options.incumbentMinimumBatch = 25;
  expect(f.quote.facts.workers[0]).toMatchObject({ energy: 0,usedCapacity: 50 });
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' });
});


test('unsupported ready-container decay phases defer read-only instead of throwing from the simulator',() => {
  const f = startupProjectionFixture(), before = JSON.stringify(f.root);
  f.quote.facts.station.facts = { status: 'ready',id: 'container',remainingProgress: 0,energy: 0,claimedEnergy: 0,availableEnergy: 0,capacity: 2000,hits: 250000,hitsMax: 250000,ticksToDecay: 1000 };
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'station-decay-phase' });
  f.quote.facts.station.facts.ticksToDecay = 0;
  expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'station-decay-phase' });
  expect(JSON.stringify(f.root)).toBe(before);
});

test('another source paid workforce remains an explicit liability until the shared forecast can represent it',() => {
  const f = startupProjectionFixture(), worker = f.activeMiner();
  worker.memory.population!.owner = remoteFleetOwner({ home: f.request.home,room: f.request.room,source: 'other-source',kind: 'miner' });
  f.game.creeps.other = worker;
  const observed = f.observe(f.request); if (observed.status !== 'observed') throw new Error('Expected complete room workforce');
  f.quote.facts = observed.facts;
  expect(f.quote.facts.workers).toHaveLength(1);
  const before = JSON.stringify(f.root); expect(f.convert(f.quote,f.options)).toEqual({ status: 'deferred',reason: 'existing-workforce' });
  expect(JSON.stringify(f.root)).toBe(before);
});
