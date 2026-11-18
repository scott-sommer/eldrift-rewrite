import { vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { createRemoteManagement } from '../../src/features/remotes/management/cycle';
import type { RemoteManagementRequest } from '../../src/features/remotes/management/model';
import { remoteOffer, portfolioPolicy } from './remote-portfolio';
import { intelSummary } from './intel-summary';
export function managementFixture() {
  const root = {}, state = createMemoryPort(() => root), assignments = createRemoteAssignmentStore(state), offer = remoteOffer();
  const portfolio = portfolioPolicy({ maximumAge: 100 });
  const request: RemoteManagementRequest = { home: 'W0N1',tick: 20,policy: { candidates: [{ room: offer.room,commitment: offer.commitment }],
    economics: offer.quotes[0]!.assessment.policy,portfolio,reserve: true,infrastructure: { roads: true,containers: true },
    leaseLifetime: 100,scanLifetime: 20,reassessInterval: 10,traversal: { mode: 'known-safe',username: 'bot',allies: [],blockedRooms: [],avoidUntil: {},
      allowKeeper: false,maximumAge: 100,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 } } };
  const summary = { ...intelSummary(15,offer.room),structures: [],units: [],sources: offer.quotes.map(quote => quote.assessment.sourceFacts),
    controller: { id: 'controller',x: 25,y: 25,level: 0,owned: false,owner: null,reservation: null } };
  const ports = { summary: vi.fn(() => summary),assess: vi.fn((input: { source: string }) => structuredClone(offer.quotes.find(quote => quote.assessment.source === input.source)!.assessment)),
    current: vi.fn(() => true) };
  const manager = () => createRemoteManagement(state,request.home,ports);
  return { root,state,assignments,offer,request,summary,ports,manager };
}
