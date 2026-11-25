import { expect, test } from 'vitest';
import { createLaborCandidate } from '../../src/capabilities/economy/startup/household/labor/candidate';
import { createLaborProposal } from '../../src/capabilities/economy/startup/household/labor/proposal';
import { quoteLaborTravel } from '../../src/capabilities/economy/startup/household/labor/travel';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { startupProjectIdentity } from '../../src/capabilities/economy/startup/checkpoints/project-identity';
import { startupPassiveProject } from '../fixtures/startup-passive-project';
import type { LaborCandidateSeed } from '../../src/capabilities/economy/startup/household/labor/candidate-model';
import type { LaborProposalFacts, LaborProposalPorts } from '../../src/capabilities/economy/startup/household/labor/proposal-model';
function fixture() {
  const base = startupPassiveProject(), spawning = base.project.spawning,home = 'W0N1',point = (x: number,y = 1) => ({ room: home,x,y });
  spawning.room = home; spawning.requests = spawning.requests.map(request => ({ ...request,room: home })); spawning.spawns = spawning.spawns.map(spawn => ({ ...spawn,room: home }));
  const seed: LaborCandidateSeed = { base,endpoint: 'stock',proposal: { observedAt: 1,request: { id: 'worker',name: 'worker',owner: 'home',room: home,body: ['work','carry','move'],priority: -2,readyAt: 0,expiresAt: 101,placement: { spawn: 'spawn',exit: point(2) } },
    source: 'stock',pickup: point(2),order: { id: 'target',kind: 'build',position: point(8),priority: 20,score: 0 },service: point(5),policy: { horizon: 100,maximumLoad: 10,maximumWorkTicks: 2,reserve: 20 } } };
  const facts: LaborProposalFacts = { spawn: { id: 'spawn',position: point(1) },source: { id: 'stock',position: point(2,2),energy: 700,capacity: 730,freeCapacity: 30,claimedEnergy: 0,claimedCapacity: 0,availableEnergy: 700 },target: { id: 'target',position: point(8),kind: 'build',remainingWork: 3 } };
  const ports: LaborProposalPorts = { now: () => 1,observe: () => ({ status: 'observed',facts }),travel: (plan,guard) => quoteLaborTravel(plan,'snapshot',leg => {
    const path = [],direction = Math.sign(leg.destination.x-leg.origin.x); for (let x = leg.origin.x; x !== leg.destination.x;) { x += direction; path.push({ ...leg.origin,x }); }
    return { status: 'complete',path,terrain: path.map(() => 2 as const),operations: path.length };
  },guard) };
  return { seed,facts,prepare: createLaborCandidate(createLaborProposal(ports)) };
}
test('candidate preview admits and charges the worker once before attaching required work',() => {
  const f = fixture(), before = startupProjectIdentity(f.seed.base), result = f.prepare(f.seed,1); expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error('Expected candidate');
  const candidate = result.read(); expect(candidate.previewFrames).toBe(1); expect(candidate.proposal.input.birth).toMatchObject({ request: 'worker',startAt: 0,activeAt: 9,cost: 200 });
  expect(candidate.input.project.spawning.requests.filter(request => request.id === 'worker')).toHaveLength(1);
  const forecast = forecastStartupProject(candidate.input); expect(result.fulfilled(forecast)).toBe(true); expect(forecast.spawning.births.filter(birth => birth.request === 'worker')).toHaveLength(1);
  expect(startupProjectIdentity(f.seed.base)).toBe(before); candidate.input.project.spawning.liveNames = new Set(['changed']); expect(result.read().input.project.spawning.liveNames.size).toBe(0);
  f.seed.base = result.read().input; const repeated = f.prepare(f.seed,1); if (repeated.status !== 'ready') throw new Error('Expected idempotent candidate');
  expect(repeated.read().input.household!.labor!.jobs).toHaveLength(1);
});
test('budgeted birth preview resumes its bound checkpoint and matches uninterrupted preparation',() => {
  const f = fixture(); f.seed.proposal.request.readyAt = 2; const first = f.prepare(f.seed,1);
  expect(first).toMatchObject({ status: 'deferred',reason: 'preview-budget',previewFrames: 1 }); if (!('checkpoint' in first)) throw new Error('Expected preview checkpoint');
  const saved = JSON.parse(JSON.stringify(first.checkpoint)), resumed = f.prepare(f.seed,6,saved), full = f.prepare(f.seed,7);
  if (resumed.status !== 'ready' || full.status !== 'ready') throw new Error('Expected resumed candidates');
  expect(resumed.read().proposal.input.birth.startAt).toBe(6); expect(resumed.read().input).toEqual(full.read().input);
  saved.binding += 'corrupt'; expect(() => f.prepare(f.seed,6,saved)).toThrow();
});
test('source binding, snapshot liabilities and conflicting request identity refuse',() => {
  const f = fixture(); f.seed.endpoint = 'other'; expect(f.prepare(f.seed,1)).toMatchObject({ reason: 'endpoint-binding' }); f.seed.endpoint = 'stock';
  f.facts.source.freeCapacity = 20; expect(f.prepare(f.seed,1)).toMatchObject({ reason: 'sink-liabilities' }); f.facts.source.freeCapacity = 30;
  f.facts.source.availableEnergy = 699; f.facts.source.claimedEnergy = 1; expect(f.prepare(f.seed,1)).toMatchObject({ reason: 'endpoint-snapshot' });
  f.seed.base.project.spawning.requests = [...f.seed.base.project.spawning.requests,{ ...f.seed.proposal.request,name: 'different' }]; expect(f.prepare(f.seed,1)).toMatchObject({ reason: 'request-conflict' });
});
test('unfunded work cannot satisfy the candidate even when its body was paid, and guards refuse',() => {
  const f = fixture(); expect(f.prepare(f.seed,1,undefined,() => false)).toMatchObject({ reason: 'admission',previewFrames: 0 });
  f.seed.base.household!.endpointEnergy = 0; const result = f.prepare(f.seed,1); if (result.status !== 'ready') throw new Error('Expected candidate');
  expect(result.fulfilled(forecastStartupProject(result.read().input))).toBe(false);
});
