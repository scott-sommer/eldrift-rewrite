import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { nativeWorkerBirthBoosts } from '../../src/app/native-worker-boosts';
import { defaults } from '../../src/config/model';
import { workOwner } from '../../src/features/work/identity';
import { boostRequest } from '../fixtures/boosts';
test('worker owner consumes confirmed/optional outcomes, while required failure and other owners still need explicit decisions',() => {
  const memory = {}, state = createMemoryPort(() => memory), store = createBoostRequests(state), owner = workOwner('W0N1','upgrader');
  for (const id of ['confirmed','optional','required','foreign']) {
    const request = { ...boostRequest(id,id !== 'optional'),owner: id === 'foreign' ? 'mission' : owner };
    store.submit(request,1); store.update(request.owner,id,job => {
      job.status = id === 'confirmed' ? 'confirmed' : 'failed'; job.observed = id === 'confirmed' ? [2] : [0];
    });
  }
  expect(nativeWorkerBirthBoosts(state,{ name: 'W0N1' } as Room,defaults)).toBeUndefined();
  expect(store.get(owner,'confirmed')!.acknowledged).toBe(true); expect(store.get(owner,'optional')!.acknowledged).toBe(true);
  expect(store.get(owner,'required')!.acknowledged).toBe(false); expect(store.get('mission','foreign')!.acknowledged).toBe(false);
});
