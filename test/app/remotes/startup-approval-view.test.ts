import { afterEach, expect, test, vi } from 'vitest';
import { createEconomicApprovalViews } from '../../../src/app/remotes/startup/economic/approval-view';
import { economicCohortFixture } from '../../fixtures/startup-economic';
import type { RemoteFleetProfile } from '../../../src/features/remotes/fleet/model';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const f = economicCohortFixture(); f.planner.advance({ ...f.query,tick: 2,expectedRevision: f.planner.read().revision },1000); f.at(2);
  f.approvals.capture({ query: f.query,quote: f.context.quote,rooms: f.context.rooms,policy: f.context.policy },0);
  const approval = f.approvals.read().approvals[0]!, profile = { home: f.home,room: f.query.room,source: f.query.source,generation: 1,kind: 'miner',body: f.context.quote.plan.miner } as RemoteFleetProfile;
  const read = vi.fn(() => f.approvals.read().approvals.find(entry => entry.job.generation === profile.generation)), views = createEconomicApprovalViews(read);
  return { ...f,approval,profile,read,views };
}
test('paid service reuses detached validated geometry while financial reads remain current',() => {
  const f = fixture(); expect(f.views.current(f.profile)).toBeDefined(); const before = f.root();
  const first = f.views.service(f.profile)!; first.spawn.exit.x++;
  expect(f.views.service(f.profile)).toEqual(f.context.quote.plan); expect(f.read).toHaveBeenCalledTimes(1); expect(f.root()).toBe(before);
  f.views.current(f.profile); expect(f.read).toHaveBeenCalledTimes(2);
});
test('loss of approval cannot grant financial authority even when a paid actor retains its service geometry',() => {
  const f = fixture(); f.views.current(f.profile); f.approvals.withdraw(f.approvals.read().revision,2,f.query);
  expect(f.views.current(f.profile)).toBeUndefined(); expect(f.views.service(f.profile)).toEqual(f.context.quote.plan);
});
test('a different body, generation or source cannot borrow cached service geometry',() => {
  const f = fixture(); f.views.current(f.profile);
  expect(f.views.service({ ...f.profile,body: ['move'] })).toBeNull();
  f.read.mockReturnValue(undefined);
  expect(f.views.service({ ...f.profile,generation: 2 })).toBeUndefined(); expect(f.views.service({ ...f.profile,source: 'other' })).toBeUndefined();
});
