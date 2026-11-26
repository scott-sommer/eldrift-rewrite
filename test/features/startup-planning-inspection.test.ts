import { afterEach, expect, test, vi } from 'vitest';
import { economicCohortFixture } from '../fixtures/startup-economic';
afterEach(() => vi.unstubAllGlobals());
test('mutating the exposed detached record cannot change captured validated continuation evidence',() => {
  const f = economicCohortFixture(), inspection = f.planner.inspect(), revision = inspection.record.revision;
  inspection.record.revision = 999; inspection.record.job!.checkpoint.tick = 9999;
  const progress = inspection.advance({ ...f.query,tick: 2,expectedRevision: revision },20);
  expect(progress).toMatchObject({ status: 'deferred',reason: 'budget',frames: 20 }); expect(f.planner.read().job!.checkpoint.tick).toBe(21); expect(f.planner.read().revision).toBe(revision+1);
});
test('an intervening writer is fenced at save even when a captured snapshot can simulate more frames',() => {
  const f = economicCohortFixture(), inspection = f.planner.inspect(), revision = inspection.record.revision;
  f.planner.advance({ ...f.query,tick: 2,expectedRevision: revision },1); const before = f.root();
  expect(inspection.advance({ ...f.query,tick: 3,expectedRevision: revision },20)).toMatchObject({ status: 'deferred',reason: 'conflict' }); expect(f.root()).toBe(before);
});
test('old completed inspection results grant no authority after scratch withdrawal',() => {
  const f = economicCohortFixture(); f.planner.advance({ ...f.query,tick: 2,expectedRevision: f.planner.read().revision },1000);
  const inspection = f.planner.inspect(); f.planner.withdraw(inspection.record.revision,3,f.query); f.at(3);
  expect(inspection.result(f.query)).toBeDefined(); expect(f.planner.result(f.query)).toBeUndefined();
  expect(f.approvals.capture({ query: f.query,quote: f.context.quote,rooms: f.context.rooms,policy: f.context.policy },0)).toBe('unavailable'); expect(f.approvals.read().approvals).toEqual([]);
});
