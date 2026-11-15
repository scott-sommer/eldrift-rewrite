import { expect, test } from 'vitest';
import { createPlanProposal } from '../../src/features/planning/plan-proposal';
import type { ProposalInput } from '../../src/features/planning/plan-proposal';
import { planSchema } from '../../src/features/planning/plan-state';
function input(): ProposalInput {
  return { strategy: 'standard', entries: [
    { type: 'spawn', position: { x: 20, y: 20 }, rcl: 1, priority: -430, tag: 'core' },
    { type: 'storage', position: { x: 21, y: 20 }, rcl: 4, priority: -500, tag: 'core' },
    { type: 'container', position: { x: 10, y: 10 }, rcl: 3, priority: -398, tag: 'source', objectId: 'source-id' },
    { type: 'road', position: { x: 11, y: 10 }, rcl: 3, priority: -190, source: 'operator', dependencies: ['container:10:10'] },
  ], provenance: { candidateId: 'standard:21:20:0', strategyVersion: '1', observation: 'obs', policy: 'policy',
    generatedAt: 1, anchor: { x: 21, y: 20 }, transform: 0,
    costs: { hauling: 0, service: 0, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 } } };
}
test('generated entries preserve priorities, object associations, ownership and dependency metadata', () => {
  const request = input(), proposal = createPlanProposal(request);
  expect(proposal.entries[2]).toMatchObject({ type: 'container', tag: 'source', objectId: 'source-id', priority: -398 });
  expect(proposal.entries[3]).toMatchObject({ source: 'operator', dependencies: ['container:10:10'] });
  expect(proposal.provenance.bootstrap).toEqual({ spawn: 'spawn:20:20', storage: 'storage:21:20' });
  const state = { room: 'W0N1', revision: 1, ...proposal, provenance: { ...proposal.provenance, committedAt: 2 } };
  expect(planSchema('W0N1', ['spawn', 'storage', 'road', 'container']).valid(state)).toBe(true);
  request.entries[0]!.position.x = 30;
  expect(proposal.entries[0]!.x).toBe(20);
});
test('missing priorities and ambiguous or mismatched bootstrap placements are rejected', () => {
  const request = input();
  expect(() => createPlanProposal({ ...request, entries: request.entries.slice(1) })).toThrow('bootstrap');
  expect(() => createPlanProposal({ ...request, entries: [...request.entries, request.entries[0]!] })).toThrow('bootstrap');
  expect(() => createPlanProposal({ ...request, provenance: { ...request.provenance, anchor: { x: 22, y: 20 } } })).toThrow('anchor');
  const withoutPriority = { ...request.entries[0]! };
  delete withoutPriority.priority;
  expect(() => createPlanProposal({ ...request, entries: [withoutPriority, ...request.entries.slice(1)] })).toThrow('priority');
});
