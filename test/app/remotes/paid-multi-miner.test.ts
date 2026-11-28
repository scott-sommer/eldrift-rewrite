import { expect,test } from 'vitest';
import { paidMultiMinerFixture } from '../../fixtures/paid-multi-miner';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';

test('two scheduled source actors share task/control owners and conserve material through resumed harvest/handoff',() => {
  const f = paidMultiMinerFixture();
  for (let tick = 10; tick <= 13; tick++) {
    const result = f.world.step(f.frame(tick)); expect(result.deliveries).toEqual([]);
    if (tick === 13) expect(result.effects).toMatchObject([{ kind: 'transfer',source: 'miner-id-2',target: 'container-2',amount: 50 },{ kind: 'transfer',source: 'miner-id',target: 'container',amount: 50 }]);
  }
  const fresh = paidMultiMinerFixture(),resumed = resumeHomeHaulingWorld(JSON.parse(JSON.stringify(f.world.checkpoint())),fresh.configure);
  for (let tick = 14; tick <= 16; tick++) expect(resumed.step(fresh.frame(tick))).toEqual(f.world.step(f.frame(tick)));
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
  const cp = f.world.checkpoint();
  expect(cp.inventory.stores.reduce((sum,store) => sum+store.energy,0)+cp.inventory.ecology!.sources.reduce((sum,source) => sum+source.energy,0)).toBe(296);
  expect(cp.inventory.stores.find(store => store.id === 'bank')!.energy).toBe(0);
});
