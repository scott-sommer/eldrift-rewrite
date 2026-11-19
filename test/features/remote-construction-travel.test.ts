import { expect, test } from 'vitest';
import { infrastructureFixture } from '../fixtures/remote-infrastructure';
import { remoteConstructionTravel } from '../../src/features/remotes/infrastructure/worker-travel';
function fixture() { const f = infrastructureFixture(); f.store.save(0,f.demand,f.draft,1); return f.store.read(); }
test('loaded planned-route bound drives retirement and replacement separately',() => {
  const record = fixture(), timing = remoteConstructionTravel(record,1500,25,point => point.room === 'E0N1' ? 8 : 2,() => true)!;
  expect(timing).toEqual({ travelTicks: 28,retireTicks: 53,marginTicks: 25,serviceTicks: 1419,replacementTicks: 1393 });
});
test('blocked or unknown route tiles and budget loss cannot produce a timing certificate',() => {
  const record = fixture();
  expect(remoteConstructionTravel(record,1500,25,() => undefined,() => true)).toBeUndefined();
  expect(remoteConstructionTravel(record,1500,25,() => 2,() => false)).toBeUndefined();
  expect(remoteConstructionTravel(record,50,25,() => 8,() => true)).toBeUndefined();
});
test('partial route drafts do not authorize workforce travel',() => {
  const record = fixture(); record.draft!.sources.push('missing');
  expect(remoteConstructionTravel(record,1500,25,() => 2,() => true)).toBeUndefined();
});
