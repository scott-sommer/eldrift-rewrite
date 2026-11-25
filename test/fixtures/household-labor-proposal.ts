import { createLaborProposal } from '../../src/capabilities/economy/startup/household/labor/proposal';
import { quoteLaborTravel } from '../../src/capabilities/economy/startup/household/labor/travel';
import type { LaborProposalInput, LaborProposalFacts, LaborProposalPorts } from '../../src/capabilities/economy/startup/household/labor/proposal-model';
export function laborProposalFixture() {
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
