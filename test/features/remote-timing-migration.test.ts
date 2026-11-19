import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteTravelProgress } from '../../src/features/remotes/management/travel-progress';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { remoteFleetOwner } from '../../src/features/remotes/fleet/identity';
import { managementFixture } from '../fixtures/remote-management';
const travelKey = 'remoteTravel/W0N1', fleetKey = 'remoteFleet/W0N1';
function legacyTravel() {
  const root = {}, state = createMemoryPort(() => root);
  const data = { revision: 4,clock: 20,identity: 'old',legs: [{ ticks: 10,operations: 5,arrival: { room: 'E0N1',x: 10,y: 10 } }] };
  state.write(travelKey,{ owner: 'remotes',version: 1,data });
  return { root,state,data };
}
test('legacy three-leg progress resets detached measurements and retains CAS/clock until explicit save',() => {
  const { root,state } = legacyTravel(), before = JSON.stringify(root), store = createRemoteTravelProgress(state,'W0N1');
  expect(store.read()).toEqual({ revision: 4,clock: 20,identity: '',legs: [] }); expect(JSON.stringify(root)).toBe(before);
  expect(store.save(4,21,'new',[])).toBe(true);
  expect(state.read(travelKey)).toMatchObject({ version: 2,data: { revision: 5,clock: 21 } });
});
test('corrupt legacy travel never becomes an empty successful migration',() => {
  const { root,state,data } = legacyTravel(); data.legs[0]!.ticks = -1; state.write(travelKey,{ owner: 'remotes',version: 1,data });
  const before = JSON.stringify(root); expect(() => createRemoteTravelProgress(state,'W0N1').read()).toThrow(); expect(JSON.stringify(root)).toBe(before);
});
test('legacy manager quotes are discarded while managed lease generations and revision survive',() => {
  const f = managementFixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  const key = 'remoteManagement/W0N1', current = createRemoteManagementStore(f.state,'W0N1').read(), old = structuredClone(current);
  for (const offer of old.offers) for (const quote of offer.quotes) Reflect.deleteProperty(quote.assessment.travel,'minerReturnTicks');
  f.state.write(key,{ owner: 'remotes',version: 1,data: old }); const before = JSON.stringify(f.root);
  const store = createRemoteManagementStore(f.state,'W0N1'), migrated = store.read();
  expect(migrated).toMatchObject({ revision: old.revision,clock: old.clock,managed: old.managed,identity: '',offers: [],reports: [],scannedAt: null });
  expect(JSON.stringify(f.root)).toBe(before); expect(store.save(migrated.revision,{ ...migrated,clock: 21 })).toBe(true);
  expect(f.state.read(key)).toMatchObject({ version: 3 });
});
test('legacy fleet withdraws only its own unmeasured profiles without changing unrelated state',() => {
  const { state } = legacyTravel(), identity = { home: 'W0N1',room: 'E0N1',source: 'source',kind: 'miner' as const };
  const actor = { ...identity,owner: remoteFleetOwner(identity),generation: 1,body: ['work','carry','move'],desired: 1,travelTicks: 10,marginTicks: 5,retireTicks: 15,priority: 20 };
  state.write(fleetKey,{ owner: 'remotes',version: 1,data: { home: 'W0N1',revision: 4,clock: 20,next: 0,actors: [actor] } });
  state.write('fixture/unrelated',{ owner: 'fixture',version: 1,data: { preserved: true } }); const unrelated = state.read('fixture/unrelated');
  const store = createRemoteFleetStore(state,'W0N1'), migrated = store.read();
  expect(migrated.actors).toEqual([{ ...actor,desired: 0 }]); expect(store.save(4,21,migrated.actors)).toBe(true);
  expect(state.read(fleetKey)).toMatchObject({ version: 2 }); expect(state.read('fixture/unrelated')).toEqual(unrelated);
});

test('corrupt legacy manager quotes are rejected without persisting a reset',() => {
  const f = managementFixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  const key = 'remoteManagement/W0N1', old = createRemoteManagementStore(f.state,'W0N1').read();
  old.offers[0]!.quotes[0]!.assessment.travel.minerTicks = -1;
  f.state.write(key,{ owner: 'remotes',version: 1,data: old }); const before = JSON.stringify(f.root);
  expect(() => createRemoteManagementStore(f.state,'W0N1').read()).toThrow(); expect(JSON.stringify(f.root)).toBe(before);
});
