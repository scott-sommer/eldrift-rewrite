import type { StagedTile } from '../../capabilities/planning/template';
import type { PlanEntry } from './plan-model';
import type { PlanProvenance } from './plan-provenance';
import type { PlanProposal } from './plan-store';
import { copyPlain } from '../../persistence/plain-data';
import { placementKey } from './dependencies';
export interface ProposalPlacement extends StagedTile {
  source?: PlanEntry['source'];
  dependencies?: readonly string[];
}
export interface ProposalInput {
  strategy: string; entries: readonly ProposalPlacement[];
  provenance: Omit<PlanProvenance, 'committedAt' | 'bootstrap'>;
}
/** Preserve placement policy metadata; bootstrap always comes from the eventual staged plan. */
export function createPlanProposal(input: ProposalInput): PlanProposal {
  const entries = input.entries.map(planEntry);
  const spawns = entries.filter(entry => entry.type === 'spawn' && entry.rcl === 1);
  const storage = entries.filter(entry => entry.type === 'storage');
  if (spawns.length !== 1 || storage.length !== 1) throw new Error('Plan requires one bootstrap spawn and storage');
  if (storage[0]!.x !== input.provenance.anchor.x || storage[0]!.y !== input.provenance.anchor.y) {
    throw new Error('Storage does not match plan anchor');
  }
  return copyPlain({ strategy: input.strategy, entries, provenance: { ...input.provenance,
    bootstrap: { spawn: placementKey(spawns[0]!), storage: placementKey(storage[0]!) } } });
}
export function planEntry(entry: ProposalPlacement): PlanEntry {
  if (entry.priority === undefined || !Number.isFinite(entry.priority)) throw new Error('Missing plan placement priority');
  return { type: entry.type, x: entry.position.x, y: entry.position.y, rcl: entry.rcl,
    priority: entry.priority, source: entry.source ?? 'strategy',
    ...(entry.tag === undefined ? {} : { tag: entry.tag }),
    ...(entry.objectId === undefined ? {} : { objectId: entry.objectId }),
    ...(entry.dependencies === undefined ? {} : { dependencies: [...entry.dependencies] }) };
}
