import { afterEach, expect, test, vi } from 'vitest';
import { readStartupServiceGeometry } from '../../src/features/remotes/startup/approvals/service-geometry';
import type { Envelope } from '../../src/persistence/versioned-state';
import type { StartupApprovalRecord } from '../../src/features/remotes/startup/approvals/model';
import { economicCohortFixture } from '../fixtures/startup-economic';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const f = economicCohortFixture(); f.planner.advance({ ...f.query,tick: 2,expectedRevision: f.planner.read().revision },1000); f.at(2);
  expect(f.approvals.capture({ query: f.query,quote: f.context.quote,rooms: f.context.rooms,policy: f.context.policy },0)).toBe('saved');
  const key = 'remoteStartupApprovals/'+f.home;
  return { ...f,key,geometry: () => readStartupServiceGeometry(f.state,f.home,f.query,2) };
}
test('service geometry survives reset and detached mutation without initializing or writing',() => {
  const f = fixture(), before = f.root(), write = vi.spyOn(f.state,'write');
  const first = f.geometry()!; first.station.x++;
  f.reload(); expect(f.geometry()).toEqual(f.context.quote.plan);
  expect(readStartupServiceGeometry(f.state,'W9N9',f.query,2)).toBeUndefined();
  expect(readStartupServiceGeometry(f.state,f.home,{ ...f.query,generation: 2 },2)).toBeUndefined();
  expect(readStartupServiceGeometry(f.state,f.home,{ ...f.query,source: 'other' },2)).toBeUndefined();
  expect(write).not.toHaveBeenCalled(); expect(f.root()).toBe(before);
});
test('static geometry cannot make a corrupt financial checkpoint payable',() => {
  const f = fixture(), envelope = f.state.read(f.key) as Envelope;
  (envelope.data as StartupApprovalRecord).approvals[0]!.job.checkpoint.tick = -1;
  f.state.write(f.key,envelope); const before = f.root();
  expect(f.geometry()).toEqual(f.context.quote.plan);
  expect(() => f.approvals.read()).toThrow('invalid state data');
  expect(() => f.approvals.result(f.query)).toThrow('invalid state data'); expect(f.root()).toBe(before);
});
test('geometry projection refuses incompatible envelopes, future clocks, invalid plans and duplicate identities',() => {
  const f = fixture(), original = f.state.read(f.key) as Envelope;
  const changes: ((envelope: Envelope) => void)[] = [
    value => { value.owner = 'foreign'; },value => { value.version = 2; },
    value => { (value.data as StartupApprovalRecord).clock = 3; },
    value => { (value.data as StartupApprovalRecord).approvals[0]!.quote.plan.station.x = 99; },
    value => { (value.data as StartupApprovalRecord).approvals[0]!.job.generation = 0; },
    value => { (value.data as StartupApprovalRecord).approvals[0]!.rooms = [f.home]; },
    value => { const entries = (value.data as StartupApprovalRecord).approvals; entries.push(entries[0]!); },
  ];
  for (const change of changes) {
    const envelope = JSON.parse(JSON.stringify(original)) as Envelope; change(envelope); f.state.write(f.key,envelope);
    const before = f.root(); expect(f.geometry).toThrow(); expect(f.root()).toBe(before);
  }
});
