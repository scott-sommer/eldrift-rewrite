import { expect, test } from 'vitest';
import { createLaborProposal } from '../../src/capabilities/economy/startup/household/labor/proposal';
import { quoteLaborTravel } from '../../src/capabilities/economy/startup/household/labor/travel';
import type { LaborProposalInput, LaborProposalFacts, LaborProposalPorts } from '../../src/capabilities/economy/startup/household/labor/proposal-model';
function fixture() {
  const point = (x: number,y = 1) => ({ room: 'W0N1',x,y }); let tick = 1, observed = 0;
  const input: LaborProposalInput = { observedAt: 1,request: { id: 'worker',name: 'worker',owner: 'home',room: 'W0N1',body: ['work','carry','move'],priority: 0,readyAt: 0,expiresAt: 25,placement: { spawn: 'spawn',exit: point(2) } },
    birth: { request: 'worker',spawn: 'spawn',startAt: 0,activeAt: 9,cost: 200 },source: 'stock',pickup: point(2),order: { id: 'target',kind: 'build',position: point(8),priority: 20,score: 0 },service: point(5),
    policy: { horizon: 24,maximumLoad: 10,maximumWorkTicks: 2,reserve: 20 } };
  const facts: LaborProposalFacts = { spawn: { id: 'spawn',position: point(1) },source: { id: 'stock',position: point(2,2),energy: 100,capacity: 1000,freeCapacity: 900,claimedEnergy: 0,claimedCapacity: 0,availableEnergy: 100 },target: { id: 'target',position: point(8),kind: 'build',remainingWork: 3 } };
  const ports: LaborProposalPorts = { now: () => tick,observe: () => { observed++; return { status: 'observed',facts }; },travel: (plan,guard) => quoteLaborTravel(plan,'snapshot',leg => {
    const path = [],direction = Math.sign(leg.destination.x-leg.origin.x); for (let x = leg.origin.x; x !== leg.destination.x;) { x += direction; path.push({ ...leg.origin,x }); }
    return { status: 'complete',path,terrain: path.map(() => 2 as const),operations: path.length };
  },guard) };
  return { input,facts,ports,propose: createLaborProposal(ports),tick: (value: number) => { tick = value; },observed: () => observed };
}
test('proposal combines current workload, protected capital, paid activation and measured loaded/empty routes',() => {
  const f = fixture(), before = JSON.stringify(f.input), result = f.propose(f.input); expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('Expected proposal');
  expect(result.read().job).toMatchObject({ request: 'worker',pickupAt: 9,energy: 3,workTicks: 1,outboundTicks: 5,returnTicks: 3 });
  expect(result.current()).toBe(true); expect(JSON.stringify(f.input)).toBe(before);
  const copy = result.read(); copy.job.energy = 999; f.input.policy.maximumLoad = 1; expect(result.read().job.energy).toBe(3);
});
test('proposal revalidation sees detached fact changes and expires on the next native tick',() => {
  const f = fixture(), result = f.propose(f.input); if (result.status !== 'ready') throw new Error('Expected proposal');
  f.facts.source.claimedEnergy = 99; f.facts.source.availableEnergy = 1; expect(result.current()).toBe(false);
  f.facts.source.claimedEnergy = 0; f.facts.source.availableEnergy = 100; expect(result.current()).toBe(true);
  f.facts.target.remainingWork = 2; expect(result.current()).toBe(false); f.facts.target.remainingWork = 3; f.tick(2); expect(result.current()).toBe(false);
});
test('stale observations, denied budget and protected endpoint stock defer without reservation effects',() => {
  const f = fixture(); expect(f.propose(f.input,() => false)).toMatchObject({ reason: 'admission' }); expect(f.observed()).toBe(0);
  f.tick(2); expect(f.propose(f.input)).toMatchObject({ reason: 'observation' }); f.tick(1);
  f.facts.source.availableEnergy = 20; expect(f.propose(f.input)).toMatchObject({ reason: 'endpoint-capital' });
  f.input.request.boost = { steps: [{ part: 'work',resource: 'XGH2O',count: 1 }],required: true,timeout: 50 };
  expect(f.propose(f.input)).toMatchObject({ reason: 'boost-policy' });
});
test('a changed quote-time fact, insufficient horizon and invalid paid birth cannot publish a ready job',() => {
  const f = fixture(), travel = f.ports.travel; f.ports.travel = (plan,guard) => { const result = travel(plan,guard); f.facts.target.remainingWork = 0; return result; };
  expect(f.propose(f.input)).toMatchObject({ reason: 'facts-changed' });
  f.ports.travel = travel; f.facts.target.remainingWork = 3; f.input.policy.horizon = 11; expect(f.propose(f.input)).toMatchObject({ reason: 'horizon' });
  f.input.policy.horizon = 24; f.input.birth.cost = 0; expect(() => f.propose(f.input)).toThrow('paid household');
});
