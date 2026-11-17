import type { PlanningJobCheckpoint } from '../../src/features/planning/planning-job-model';
export function retainedPlanningJob(): PlanningJobCheckpoint {
  const proposal = { strategy: 'standard', entries: [
    { type: 'spawn', x: 24, y: 25, rcl: 1, priority: -430, source: 'strategy' as const },
    { type: 'storage', x: 25, y: 25, rcl: 4, priority: -500, source: 'strategy' as const }],
    provenance: { candidateId: 'standard:0', strategyVersion: '1', observation: 'obs', policy: 'policy',
      generatedAt: 1, anchor: { x: 25, y: 25 }, transform: 0 as const,
      bootstrap: { spawn: 'spawn:24:25', storage: 'storage:25:25' },
      costs: { hauling: 1, service: 1, capacityShortfall: 0, swamps: 0, defense: 0, migration: 0 } } };
  return { version: 1, signature: 'job-v1', next: 1, seen: ['standard:0'], rejected: 0,
    best: proposal, previous: { ...proposal, provenance: { ...proposal.provenance, candidateId: 'standard:0' } } };
}
