import { expect, test } from 'vitest';
import { managementFixture } from '../fixtures/remote-management';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
const key = 'remoteManagement/W0N1';
function fixture() {
  const f = managementFixture(); f.manager().advance(f.request,{ rooms: 1,sources: 2 },() => true);
  const data = f.manager().read(); f.state.write(key,{ owner: 'remotes',version: 2,data });
  return { ...f,data };
}
test('version-two offers are remeasured while lease generations, revision/clock and unrelated state survive detached migration',() => {
  const f = fixture(), before = JSON.stringify(f.root), store = createRemoteManagementStore(f.state,'W0N1'), migrated = store.read();
  expect(migrated).toMatchObject({ revision: f.data.revision,clock: f.data.clock,managed: f.data.managed,identity: '',offers: [],reports: [],scannedAt: null });
  expect(JSON.stringify(f.root)).toBe(before); expect(store.save(migrated.revision,{ ...migrated,clock: 21 })).toBe(true);
  expect(f.state.read(key)).toMatchObject({ version: 3 }); expect(f.assignments.owner('E0N1',21)!.generation).toBe(f.data.managed[0]!.generation);
});
test('corrupt old measurements or undeclared reservation metadata do not become valid blank migrations',() => {
  const f = fixture(); f.data.offers[0]!.quotes[0]!.assessment.travel.minerReturnTicks = -1;
  f.state.write(key,{ owner: 'remotes',version: 2,data: f.data }); const before = JSON.stringify(f.root);
  expect(() => createRemoteManagementStore(f.state,'W0N1').read()).toThrow(); expect(JSON.stringify(f.root)).toBe(before);
  const other = fixture(); other.data.offers[0]!.reservation = null; other.state.write(key,{ owner: 'remotes',version: 2,data: other.data });
  expect(() => createRemoteManagementStore(other.state,'W0N1').read()).toThrow('legacy reservation');
});
