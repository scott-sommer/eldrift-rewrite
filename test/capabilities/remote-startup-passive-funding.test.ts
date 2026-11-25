import { createStartupCashLedger } from '../../src/capabilities/economy/startup/cash-ledger';
import { expect, test } from 'vitest';
import { createStartupSpawnTimeline } from '../../src/capabilities/economy/startup/spawn-timeline';
import type { StartupSpawnInput } from '../../src/capabilities/economy/startup/spawn-model';
function input(): StartupSpawnInput {
  return { room: 'home',spawns: [{ id: 'spawn',room: 'home',availableAt: 0 }],requests: [{ id: 'worker',name: 'worker',owner: 'home',room: 'home',body: ['move'],priority: 0,readyAt: 0,expiresAt: 100 }],liveNames: new Set(),unaffordable: 'skip',
    funding: { capacity: 300,initialEnergy: 0,refills: [],energyLayout: { structures: [{ id: 'spawn',kind: 'spawn',energy: 0,capacity: 300 }],orders: [{ spawn: 'spawn',structures: ['spawn'] }],regeneration: { eligibleSpawns: ['spawn'],otherRoomEnergy: 0 } } },
    cash: { homeEnergy: 0,protectedEnergy: 0,horizon: 50,readyAt: 0,selfHarvestedConstruction: 0,flows: [] } };
}
test('passive cash funds a later paid birth without backdating admission or inventing source profit',() => {
  const view = input(), model = createStartupSpawnTimeline(view);
  for (let tick = 0; tick < 50; tick++) { expect(model.begin(tick)).toEqual([]); model.finish(); }
  const saved = model.checkpoint(); expect(saved).toMatchObject({ tick: 50,energy: { format: 2,ambientThrough: 49 },accounting: { state: { ambientEnergy: 50,endingEnergy: 50 } } });
  const resumed = createStartupSpawnTimeline(view,JSON.parse(JSON.stringify(saved))); expect(resumed.frameAmbientEnergy()).toBe(1);
  for (const timeline of [model,resumed]) { expect(timeline.begin(50)).toMatchObject([{ request: 'worker',startAt: 50,cost: 50 }]); timeline.finish(); }
  expect(resumed.result()).toEqual(model.result());
  expect(model.result()).toMatchObject({ cash: { ambientEnergy: 51,endingEnergy: 1,deliveredEnergy: 0,birthEnergy: 50,homeCashSurplus: -50,constructionRecoveryMargin: -50,firstDeliveryAt: null,firstRecoveryAt: null },funding: { endingSpawnEnergy: 1,refilledEnergy: 0,unfilledEnergy: 0 } });
});
test('ambient input may occupy reserved space yet remains spendable without granting another deposit',() => {
  const view = input(); view.cash.homeEnergy = 299; view.cash.horizon = 1; view.funding.initialEnergy = 299;
  view.funding.energyLayout!.structures = [{ id: 'spawn',kind: 'spawn',energy: 299,capacity: 300,reservedCapacity: 1 }];
  view.requests = [{ ...view.requests[0]!,body: ['work','work','work'],readyAt: 1 }];
  const model = createStartupSpawnTimeline(view); expect(model.begin(0)).toEqual([]); model.finish();
  expect(model.fundingState()).toMatchObject({ accessible: 300,bank: 300 });
  const resumed = createStartupSpawnTimeline(view,model.checkpoint()); expect(resumed.begin(1)).toMatchObject([{ cost: 300 }]); expect(resumed.transferHousehold(10,'spawn','cargo')).toBe(0); resumed.finish();
  expect(resumed.result()).toMatchObject({ cash: { ambientEnergy: 2,birthEnergy: 300,endingEnergy: 1 },funding: { endingSpawnEnergy: 1,refilledEnergy: 0 } });
});
test('physical ambient history rejects a forged financial credit even if cash balance fields agree',() => {
  const view = input(), model = createStartupSpawnTimeline(view); model.begin(0); model.finish(); const wire = model.checkpoint();
  wire.accounting.state.ambientEnergy!++; wire.accounting.state.endingEnergy++; wire.funding.bank++;
  expect(() => createStartupSpawnTimeline(view,wire)).toThrow('checkpoint');
});
test('an unpayable expense cannot borrow the ambient credit that would settle later in the frame',() => {
  const view = input(); view.cash.flows = [{ id: 'expense',kind: 'upkeep',energy: 1,firstTick: 0,interval: null,occurrences: 1 }];
  const model = createStartupSpawnTimeline(view), before = model.checkpoint(); expect(() => model.begin(0)).toThrow('Unfunded'); expect(model.checkpoint()).toEqual(before);
});

test('restore refuses an expense backdated against later same-frame cash despite a positive ending balance',() => {
  const view = input(); view.requests = []; view.funding.energyLayout!.regeneration!.otherRoomEnergy = 300;
  view.cash.flows = [{ id: 'expense',kind: 'upkeep',energy: 1,firstTick: 0,interval: null,occurrences: 1 },{ id: 'outside',kind: 'delivery',energy: 2,firstTick: 0,interval: null,occurrences: 1 }];
  const wire = createStartupSpawnTimeline(view).checkpoint(), statistics = createStartupCashLedger(view.cash,undefined,{ ambient: true }); statistics.frame(0,view.cash.flows);
  wire.tick = 1; wire.energy!.ambientThrough = 0; wire.funding.bank = 1; wire.accounting = statistics.checkpoint();
  expect(wire.accounting.state).toMatchObject({ endingEnergy: 1,minimumEnergy: -1 });
  expect(() => createStartupSpawnTimeline(view,wire)).toThrow('checkpoint');
});

test('claimed point stock cannot masquerade as outside cargo for a deposit or a loss',() => {
  const view = input(); view.requests = []; view.cash.homeEnergy = 300; view.cash.horizon = 0; view.funding.initialEnergy = 200; view.funding.capacity = 250;
  view.funding.energyLayout!.structures = [{ id: 'spawn',kind: 'spawn',energy: 300,capacity: 300,reservedEnergy: 100 },{ id: 'extension',kind: 'extension',energy: 0,capacity: 50 }];
  view.funding.energyLayout!.orders = [{ spawn: 'spawn',structures: ['spawn','extension'] }];
  const model = createStartupSpawnTimeline(view); model.begin(0);
  expect(model.transferHousehold(100,'extension','cargo')).toBe(0);
  expect(() => model.loseHousehold({ id: 'lost',kind: 'upkeep',energy: 100,firstTick: 0,interval: null,occurrences: 1 })).toThrow('outside stock');
  model.finish(); expect(model.result()).toMatchObject({ funding: { endingSpawnEnergy: 200,refilledEnergy: 0 },cash: { endingEnergy: 300 } });
});
test('passive mode refuses a payable expense whose physical spending location is unspecified',() => {
  const view = input(); view.cash.homeEnergy = 100; view.cash.flows = [{ id: 'unlocated',kind: 'upkeep',energy: 1,firstTick: 0,interval: null,occurrences: 1 }];
  const model = createStartupSpawnTimeline(view), before = model.checkpoint(); expect(() => model.begin(0)).toThrow('Unlocated'); expect(model.checkpoint()).toEqual(before);
});
