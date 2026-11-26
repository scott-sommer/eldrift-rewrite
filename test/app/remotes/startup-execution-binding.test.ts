import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createNativeStartupExecutionBinding } from '../../../src/app/remotes/startup/execution-binding';
import { resolveConfig } from '../../../src/config/resolve';
import { startupTravelPlan } from '../../fixtures/startup-travel';
const controls = vi.hoisted(() => ({ version: 'static-v1' }));
vi.mock('../../../src/app/remotes/assessment/matrices',() => ({ prepareRemoteMatrices: () => ({ version: controls.version }) }));
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  controls.version = 'static-v1';
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: {},E0N1: {} } });
  const root = {}, state = createMemoryPort(() => root), bind = createNativeStartupExecutionBinding(state), plan = startupTravelPlan(), config = resolveConfig({},1).values;
  const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 767,maximumHouseholdCapital: 10000 };
  const read = (settings = config) => bind(plan,['W0N1','E0N1'],settings,policy);
  return { root,bind,plan,config,policy,read };
}
test('current full configuration, return policy, selected geometry and static topology fence reuse without writes',() => {
  const f = fixture(), original = f.read(); expect(original,'config bytes '+JSON.stringify(f.config).length).toBeDefined();
  expect(f.read({ ...f.config,remoteStartupEnergyReserve: 1 })).not.toBe(original);
  controls.version = 'static-v2'; expect(f.read()).not.toBe(original); controls.version = 'static-v1';
  f.policy.minimumRecoveryMargin = 1; expect(f.read()).not.toBe(original); f.policy.minimumRecoveryMargin = 0;
  f.plan.collection.y++; expect(f.read()).not.toBe(original); expect(f.root).toEqual({});
});
test('equivalent property order is stable, missing room evidence refuses',() => {
  const f = fixture();
  const reversed = Object.fromEntries(Object.entries(f.config).reverse()) as unknown as typeof f.config;
  expect(f.read(reversed)).toBe(f.read());
  expect(f.bind(f.plan,['W0N1'],f.config,f.policy)).toBeUndefined();
  delete Game.rooms.E0N1; expect(f.read()).toBeUndefined(); expect(f.root).toEqual({});
});
