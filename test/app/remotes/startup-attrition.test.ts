import { afterEach, expect, test, vi } from 'vitest';
import { observeStartupAttrition, instrumentStartupCollections } from '../../engine/startup-attrition';
import { distributorOwner } from '../../../src/features/logistics/identity';
afterEach(() => vi.unstubAllGlobals());
function fixture(lastCargo: number,tombstoneEnergy: number) {
  vi.stubGlobal('FIND_TOMBSTONES',1); vi.stubGlobal('FIND_DROPPED_RESOURCES',2); vi.stubGlobal('RESOURCE_ENERGY','energy'); vi.stubGlobal('OK',0);
  let tombstones: unknown[] = [], drops: unknown[] = [];
  const game = { time: 1,creeps: { worker: { name: 'worker',room: { name: 'W0N1' },ticksToLive: 1,spawning: false,store: { energy: lastCargo },memory: { population: { owner: distributorOwner('W0N1') } } } } as Record<string,unknown>,rooms: { W0N1: { find: (kind: number) => kind === 1 ? tombstones : drops } } };
  vi.stubGlobal('Game',game);
  const state = observeStartupAttrition(); game.time = 2; game.creeps = {};
  tombstones = [{ id: 'grave',creep: { name: 'worker' },store: { energy: tombstoneEnergy } }];
  observeStartupAttrition(state);
  return { state,game,setAssets(graves: unknown[],resources: unknown[]) { tombstones = graves; drops = resources; } };
}
test('local expiry energy comes from actual native tombstone stock, then remains distinct from inactive assets',() => {
  const f = fixture(50,50);
  expect(f.state.localExpiryEnergy).toBe(50); expect(f.state.inactiveEnergy).toBe(50);
  f.setAssets([],[{ id: 'drop',amount: 49,resourceType: 'energy' }]); f.game.time++; observeStartupAttrition(f.state);
  expect(f.state.localExpiryEnergy).toBe(50); expect(f.state.inactiveEnergy).toBe(49);
  f.setAssets([],[]); f.game.time++; observeStartupAttrition(f.state);
  expect(f.state.localExpiryEnergy).toBe(50); expect(f.state.inactiveEnergy).toBe(0); expect(f.state.expiries).toHaveLength(1);
});
test('the last visible cargo is not substituted for stock after final-frame intents',() => {
  expect(fixture(50,0).state.localExpiryEnergy).toBe(0);
  const f = fixture(0,50); expect(f.state.localExpiryEnergy).toBe(50); expect(f.state.expiries[0]?.lastCargo).toBe(0);
});
test('successful grave/drop collection invalidates the no-recovery loss assumption and hooks restore',() => {
  const f = fixture(50,50), withdraw = vi.fn(() => 0), pickup = vi.fn(() => 0);
  vi.stubGlobal('Creep',{ prototype: { withdraw,pickup } }); f.state.knownAssets.push('drop');
  const restore = instrumentStartupCollections(f.state);
  Creep.prototype.withdraw.call({} as Creep,{ id: 'grave' } as Tombstone,RESOURCE_ENERGY);
  Creep.prototype.withdraw.call({} as Creep,{ id: 'bank' } as StructureStorage,RESOURCE_ENERGY);
  Creep.prototype.pickup.call({} as Creep,{ id: 'drop',resourceType: 'energy' } as Resource);
  expect(f.state.recoveredAttempts).toBe(2); restore(); expect(Creep.prototype.withdraw).toBe(withdraw); expect(Creep.prototype.pickup).toBe(pickup);
});
