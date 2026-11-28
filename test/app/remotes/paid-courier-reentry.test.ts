import { expect,test } from 'vitest';
import { paidCourierBankingFixture } from '../../fixtures/paid-courier-banking';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';

test.each([false,true])('fresh current authority resumes the same courier after banking (alternate sink%s), with exact JSON continuation',alternate => {
  const options = { retireAt: 200,leaseExpiresAt: 110 },f = paidCourierBankingFixture(options),receipts = [];
  f.acceptBank(!alternate); f.world.step(f.frame(100)); f.authority(false);
  for (let tick = 101; tick <= 110; tick++) receipts.push(...f.world.step(f.frame(tick)).deliveries);
  expect(receipts.map(receipt => receipt.energy)).toEqual([32]);
  const checkpoint = JSON.parse(JSON.stringify(f.world.checkpoint()));
  const fresh = paidCourierBankingFixture(options); fresh.authority(false); fresh.acceptBank(!alternate);
  const resumed = resumeHomeHaulingWorld(checkpoint,fresh.configure);
  // The opening token is expired. Only explicit new current authority permits reentry.
  f.renew(1400); fresh.renew(1400); f.authority(true); fresh.authority(true); f.acceptBank(true); fresh.acceptBank(true);
  const last = alternate ? 119 : 117;
  for (let tick = 111; tick <= last; tick++) {
    const result = f.world.step(f.frame(tick)); expect(resumed.step(fresh.frame(tick))).toEqual(result); receipts.push(...result.deliveries);
    if (alternate && tick === 111) expect(f.world.checkpoint().movement.retirements![0]!.cursor.position.x).toBe(8);
  }
  expect(receipts.map(receipt => receipt.energy)).toEqual([32,50]);
  const stores = f.world.snapshot().inventories;
  expect(Object.fromEntries(stores.map(store => [store.id,store.energy]))).toMatchObject({ bank: alternate ? 50 : 82,spare: alternate ? 32 : 0,container: 50,'native-id': 0 });
  expect(f.world.checkpoint().movement.retirements).toBeUndefined();
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
});

test('an alternate-sink gap without a modelled reentry path refuses before collecting or booking another batch',() => {
  const f = paidCourierBankingFixture({ retireAt: 200,leaseExpiresAt: 110,rejoin: false });
  f.acceptBank(false); f.world.step(f.frame(100)); f.authority(false);
  for (let tick = 101; tick <= 110; tick++) f.world.step(f.frame(tick));
  const before = f.world.snapshot().inventories; f.renew(1400); f.authority(true);
  expect(() => f.world.step(f.frame(111))).toThrow('Missing modelled courier productive reentry path');
  expect(before.find(store => store.id === 'container')!.energy).toBe(100);
  expect(f.shared.quantities.list(111)).toEqual([]);
  expect(f.shared.inventory.pending()).toEqual([]);
  expect(() => f.world.checkpoint()).toThrow('Cannot resume failed home world');
});
