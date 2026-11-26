import { afterEach, expect, test, vi } from 'vitest';
import { createEconomicProposalStaging } from '../../src/app/remotes/startup/economic/staging';
import { economicCohortFixture } from '../fixtures/startup-economic';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const f = economicCohortFixture(), old = f.planner.read(); f.planner.withdraw(old.revision,1,f.query);
  const profile = { home: f.home,room: f.query.room,source: f.query.source,generation: f.query.generation } as RemoteFleetProfile;
  const staging = createEconomicProposalStaging(f.state); staging.stage(f.home,f.query);
  return { ...f,profile,staging };
}
test('a prepared input seeds on a later tick without repeating observation or publishing authority',() => {
  const f = fixture(); expect(f.staging.resume(f.profile,1,20,() => true)).toBe('waiting');
  expect(f.staging.resume(f.profile,2,20,() => false)).toBe('waiting');
  expect(f.staging.resume(f.profile,2,20,() => true)).toBe('seeded');
  expect(f.planner.read().job).toMatchObject({ observedAt: 1,checkpoint: { tick: 20 } });
  expect(f.approvals.read().approvals).toEqual([]); expect(f.state.read('spawning/'+f.home)).toBeUndefined(); expect(f.staging.resume(f.profile,3,20,() => true)).toBe('missing');
});
test('deadline, generation and intervening owner changes discard disposable inputs without overwriting state',() => {
  for (const change of ['deadline','generation','revision']) {
    const f = fixture(); if (change === 'revision') f.planner.advance({ ...f.query,tick: 2,expectedRevision: f.planner.read().revision },1);
    const before = f.root(), profile = change === 'generation' ? { ...f.profile,generation: 2 } : f.profile;
    expect(f.staging.resume(profile,change === 'deadline' ? 21 : 3,20,() => true)).toBe('missing'); expect(f.root()).toBe(before);
  }
});
test('losing the disposable cache on reset leaves no implicit approval or reusable reservation',() => {
  const f = fixture(); f.reload(); const fresh = createEconomicProposalStaging(f.state), before = f.root();
  expect(fresh.resume(f.profile,2,20,() => true)).toBe('missing'); expect(f.root()).toBe(before); expect(f.approvals.read().approvals).toEqual([]);
});

test('another source cannot evict a staged home candidate using its unrelated generation',() => {
  const f = fixture(); expect(f.staging.resume({ ...f.profile,source: 'other',generation: 20 },2,20,() => true)).toBe('waiting');
  expect(f.staging.resume(f.profile,2,20,() => true)).toBe('seeded');
});
