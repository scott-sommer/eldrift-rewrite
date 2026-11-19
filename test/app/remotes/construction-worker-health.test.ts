import { afterEach, expect, test, vi } from 'vitest';
import { healthyConstructionWorker } from '../../../src/app/remotes/infrastructure/population/model';
afterEach(() => vi.unstubAllGlobals());
test('part loss invalidates a full-body route quote even when every required role still has active parts',() => {
  vi.stubGlobal('WORK','work'); vi.stubGlobal('CARRY','carry'); vi.stubGlobal('MOVE','move');
  const body = ['work','carry','carry','move','move'] as const;
  const parts = body.map(type => ({ type,hits: 100 }));
  const creep = { body: parts,spawning: false,getActiveBodyparts: () => 1 } as unknown as Creep;
  expect(healthyConstructionWorker(creep,body)).toBe(true);
  parts[4]!.hits = 0; expect(healthyConstructionWorker(creep,body)).toBe(false);
  parts[4]!.hits = 100; expect(healthyConstructionWorker(creep,['work','carry','move'])).toBe(false);
});
