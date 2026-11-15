import { stageStandardCore } from './standard-core';
import { attachInfrastructure } from './attach-infrastructure';
import { finishDraft } from './finish-draft';
import type { FinishDraftInput } from './finish-draft';
import type { CoreCandidate } from './standard-candidates';
import { placementFailures } from './placement-validation';
export type StandardDraftInput = Omit<FinishDraftInput, 'entries' | 'storage' | 'anchors'> & { candidate: CoreCandidate };
/** Evaluate one candidate, without selecting or committing it. */
export function standardDraft(input: StandardDraftInput) {
  const foundation = standardDraftFoundation(input);
  if (!foundation.ok) return foundation;
  return finishDraft({ ...input, storage: input.candidate.anchor, entries: foundation.entries, anchors: foundation.anchors });
}
export function standardDraftFoundation(input: StandardDraftInput) {
  const { anchor, transform } = input.candidate;
  const core = stageStandardCore(anchor, transform, input.limits);
  if (!core) return { ok: false as const, phase: 'footprint' as const, details: input.candidate };
  const placement = placementFailures(core, input.observation);
  if (placement.length) return { ok: false as const, phase: 'placement' as const, details: placement };
  const attached = attachInfrastructure(core, anchor, input.observation, input.limits);
  if (!attached.ok) return { ok: false as const, phase: 'capacity' as const, details: attached.failure };
  if (attached.missing.length) return { ok: false as const, phase: 'infrastructure' as const, details: attached.missing };
  return attached;
}
