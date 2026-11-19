import { remoteConstructionOwner } from '../../../src/features/remotes/infrastructure/worker-identity';
import { afterEach, expect, test, vi } from 'vitest';
import { createNativeRemoteStartup } from '../../../src/app/remotes/startup/native';
import { defaults } from '../../../src/config/model';
import { startupFixture, startupPosition } from '../../fixtures/remote-startup';
import { reservationOwner } from '../../../src/features/remotes/reservation/identity';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
afterEach(() => vi.unstubAllGlobals());
test('eager and unrelated callers perform no startup state or native reads',() => {
  const state = { read: vi.fn(),write: vi.fn() }, settings = vi.fn(() => defaults), startup = createNativeRemoteStartup(state,{ availableEnergy: vi.fn() },settings);
  expect(startup.permit('anything',['move'],defaults)).toBe(true);
  expect(startup.admit({ id: 'other',name: 'other',owner: 'other',room: 'W0N1',body: ['move'],readyAt: 1,expiresAt: 10,priority: 1 })).toBe(true);
  expect(settings).not.toHaveBeenCalled(); expect(state.read).not.toHaveBeenCalled(); expect(state.write).not.toHaveBeenCalled();
});
test('bootstrap requires funded miner plus quoted couriers, with an exact reserve boundary',() => {
  const f = startupFixture();
  expect(f.startup.permit(f.miner.owner,f.miner.body,{ ...f.config,remoteStartupEnergyReserve: 350 })).toBe(true);
  expect(f.startup.permit(f.miner.owner,f.miner.body,{ ...f.config,remoteStartupEnergyReserve: 351 })).toBe(false);
  f.home.energyAvailable = 949; expect(f.startup.permit(f.miner.owner,f.miner.body,f.config)).toBe(false);
});
test('couriers require a miner and collection readiness rather than wasting limited funds first',() => {
  const f = startupFixture(); f.structures.push({ structureType: 'container',pos: startupPosition(5,24) });
  expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(false);
  f.game.creeps.miner = f.activeMiner(true); f.home.energyAvailable = 400;
  expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(true);
  f.home.energyAvailable = 399; expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(false);
});
test('another source cannot consume the unfinished crew commitment of an already funded miner',() => {
  const f = startupFixture(); f.game.creeps.miner = f.activeMiner(true); f.home.energyAvailable = 1300;
  expect(f.startup.permit(f.otherMiner.owner,f.otherMiner.body,f.config)).toBe(false);
  f.home.energyAvailable = 1350; expect(f.startup.permit(f.otherMiner.owner,f.otherMiner.body,f.config)).toBe(true);
});
test('couriers start within measured spawn/travel lead using current miner service and construction progress',() => {
  const f = startupFixture(); f.game.creeps.miner = f.activeMiner();
  const site = { structureType: 'container',pos: startupPosition(5,24),progressTotal: 5000,progress: 4900 }; f.sites.push(site);
  expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(false);
  site.progress = 4920; expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(true);
  f.game.creeps.miner!.ticksToLive = 40; expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(false);
});
test('unseen infrastructure and unsupported powered forecasts hold new haulers',() => {
  const f = startupFixture(); f.game.creeps.miner = f.activeMiner();
  f.sites.push({ structureType: 'container',pos: startupPosition(5,24),progressTotal: 5000,progress: 4992 });
  f.source.effects = [{ effect: 1,power: 1,level: 1,ticksRemaining: 10 }]; expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(false);
  delete f.game.rooms.E0N1; f.game.time++;
  expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(false);
});
test('reserver staging waits for all current source containers',() => {
  const f = startupFixture(), owner = reservationOwner({ home: 'W0N1',room: 'E0N1',generation: 1 });
  expect(f.startup.permit(owner,['claim','claim','move','move'],f.config)).toBe(false);
  f.structures.push({ structureType: 'container',pos: startupPosition(5,24) }); f.game.creeps.miner = f.activeMiner(); f.home.energyAvailable = 1700; f.game.time++;
  expect(f.startup.permit(owner,['claim','claim','move','move'],f.config)).toBe(true);
});
test('stock claims and the shared same-tick energy ledger reduce spendable capital without new writes',() => {
  const f = startupFixture(); f.home.storage = { id: 'bank',store: { energy: 500 } }; f.home.energyAvailable = 500;
  f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'existing',owner: 'haul',holder: 'worker',scope: 'transfer',expiresAt: 10,allocations: [{ pool: logisticsPool('stock','bank','energy'),amount: 100 }] }] } });
  const before = JSON.stringify(f.root); expect(f.startup.permit(f.miner.owner,f.miner.body,f.config)).toBe(false); expect(JSON.stringify(f.root)).toBe(before);
  f.game.time = 10; expect(f.startup.permit(f.miner.owner,f.miner.body,f.config)).toBe(true);
  f.ledger.availableEnergy.mockReturnValue(400); expect(f.startup.permit(f.miner.owner,f.miner.body,f.config)).toBe(false);
});

test('due miner replacements stay funded ahead of additional couriers or reservers',() => {
  const f = startupFixture(); f.structures.push({ structureType: 'container',pos: startupPosition(5,24) });
  f.game.creeps.miner = f.activeMiner(); f.game.creeps.miner.ticksToLive = 1; f.home.energyAvailable = 949;
  expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(false);
  f.home.energyAvailable = 950; expect(f.startup.permit(f.courier.owner,f.courier.body,f.config)).toBe(true);
});
test('paid spawning cohorts stay selected without permitting an unfunded additional birth',() => {
  const f = startupFixture(); f.game.creeps.miner = f.activeMiner(true); f.home.energyAvailable = 0;
  expect(f.startup.permit(f.miner.owner,f.miner.body,f.config)).toBe(true);
  const request = { id: 'duplicate',name: 'duplicate',owner: f.miner.owner,room: 'W0N1',body: f.miner.body,priority: 1,readyAt: 1,expiresAt: 20 };
  expect(f.startup.admit(request)).toBe(false);
});

test('settled live source cohorts need no speculative capital for a nonexistent extra birth',() => {
  const f = startupFixture(); f.game.creeps.miner = f.activeMiner(); f.home.energyAvailable = 0;
  expect(f.startup.permit(f.miner.owner,f.miner.body,f.config)).toBe(true);
  expect(f.startup.admit({ id: 'extra',name: 'extra',owner: f.miner.owner,room: 'W0N1',body: f.miner.body,priority: 1,readyAt: 1,expiresAt: 10 })).toBe(false);
});

test('surviving couriers retain their absent miner replacement liability ahead of construction births',() => {
  const f = startupFixture(), courier = f.activeMiner();
  courier.memory.population!.owner = f.courier.owner; courier.body = f.courier.body.map(type => ({ type,hits: 100 }));
  courier.getActiveBodyparts = part => courier.body.filter(item => item.type === part).length;
  f.game.creeps.miner = courier; f.home.energyAvailable = 1000;
  const owner = remoteConstructionOwner({ home: 'W0N1',room: 'E0N1',generation: 1 }), body = ['work','carry','carry','move','move'] as const;
  expect(f.startup.permit(owner,body,f.config)).toBe(false);
  f.home.energyAvailable = 1050; expect(f.startup.permit(owner,body,f.config)).toBe(true);
});
