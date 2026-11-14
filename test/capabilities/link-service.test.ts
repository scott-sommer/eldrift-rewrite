import { expect, test } from 'vitest';
import { planLinkService } from '../../src/features/logistics/links/service';
const link = (id: string, energy: number) => ({ id, energy, capacity: 800, active: true, cooldown: 10, position: { room: 'home', x: 10, y: 10 } });
const policy = { controllerNeed: 0.5, storageTarget: 0.75, maximumBatch: 200 };
const storage = { id: 'storage', energy: 1000, free: 1000 };
const roles = (stored: number, controller: number) => ({ inputs: [], relays: [], storage: link('storage-link', stored), controllers: [link('controller-link', controller)] });
test('controller demand fills storage link, bounded by stock, capacity and batch', () => {
  expect(planLinkService(roles(0, 399), storage, policy)).toEqual({ direction: 'fill', source: 'storage', sink: 'storage-link', quantity: 200 });
  expect(planLinkService(roles(590, 399), { ...storage, energy: 30 }, policy)?.quantity).toBe(30);
  expect(planLinkService(roles(790, 399), storage, { ...policy, storageTarget: 1 })?.quantity).toBe(10);
  expect(planLinkService(roles(0, 399), { ...storage, energy: 0 }, policy)).toBeUndefined();
});
test('controller need suppresses draining even above storage-link target', () => {
  expect(planLinkService(roles(600, 399), storage, policy)).toBeUndefined();
  expect(planLinkService(roles(800, 399), storage, policy)).toBeUndefined();
  expect(planLinkService(roles(600, 400), storage, policy)).toBeUndefined();
  expect(planLinkService(roles(601, 400), storage, policy)).toEqual({ direction: 'drain', source: 'storage-link', sink: 'storage', quantity: 200 });
});
test('draining respects storage capacity and works without a controller link', () => {
  const observed = { ...roles(800, 800), controllers: [] };
  expect(planLinkService(observed, { ...storage, free: 10 }, policy)?.quantity).toBe(10);
  expect(planLinkService(observed, { ...storage, free: 0 }, policy)).toBeUndefined();
  expect(planLinkService(observed, undefined, policy)).toBeUndefined();
});
test('inactive links and invalid policies cannot produce courier work', () => {
  const observed = roles(800, 800);
  expect(planLinkService({ ...observed, storage: { ...observed.storage, active: false } }, storage, policy)).toBeUndefined();
  expect(() => planLinkService(observed, storage, { ...policy, maximumBatch: 0 })).toThrow();
  expect(() => planLinkService(observed, storage, { ...policy, controllerNeed: 1.1 })).toThrow();
});
