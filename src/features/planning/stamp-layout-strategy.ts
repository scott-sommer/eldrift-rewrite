import { prepareStampComposition } from '../../capabilities/planning/stamp-composition-policy';
import { stampDraftBatch } from '../../capabilities/planning/stamp-draft-batch';
import type { StampDraftCheckpoint } from '../../capabilities/planning/stamp-draft-batch';
import type { FinishDraftInput } from '../../capabilities/planning/finish-draft';
import type { LayoutStrategy } from './layout-strategies';
import type { PlanEntry } from './plan-model';
export interface StampStrategyOptions { anchorLimit: number; attemptsPerStep: number; totalAttempts: number }
/** Adapter only: common evaluator retains hard validation, scoring and proposal ownership. */
export function createStampLayoutStrategy(
  input: Omit<FinishDraftInput, 'entries' | 'storage' | 'anchors'>, version: string,
  operatorEntries: readonly PlanEntry[], options: StampStrategyOptions,
): LayoutStrategy {
  validateOptions(version, options);
  const entries = operatorEntries.map(entry => ({ ...entry, position: { x: entry.x, y: entry.y } }));
  return { version, advance(candidate, revision, checkpoint, searches, guard) {
    if (candidate.transform !== 0) return { status: 'rejected', reason: 'stamp-candidate-transform-must-be-zero' };
    const lockedStorage = input.observation.constraints.filter(item => item.kind === 'locked' && item.type === 'storage');
    if (lockedStorage.some(item => item.position.x !== candidate.anchor.x || item.position.y !== candidate.anchor.y)) {
      return { status: 'rejected', reason: 'stamp-hub-conflicts-with-locked-storage' };
    }
    const composition = prepareStampComposition(candidate.anchor, input.observation, input.limits, options.anchorLimit, entries);
    const result = stampDraftBatch({ ...input, storage: candidate.anchor,
      composition: { ...composition, maximumTotalAttempts: options.totalAttempts } },
    revision, checkpoint as StampDraftCheckpoint | undefined, options.attemptsPerStep, searches, guard);
    if (!result.ok) return { status: 'rejected', reason: JSON.stringify(result) };
    return result.done ? { status: 'complete', entries: result.entries }
      : { status: 'pending', checkpoint: result.checkpoint };
  } };
}
function validateOptions(version: string, options: StampStrategyOptions): void {
  if (!version) throw new Error('Missing stamp strategy version');
  const bounds = [[options.anchorLimit, 1, 2500], [options.attemptsPerStep, 0, 1000000], [options.totalAttempts, 1, 1000000]];
  if (bounds.some(([value, minimum, maximum]) => !Number.isSafeInteger(value) || value! < minimum! || value! > maximum!)) {
    throw new Error('Invalid stamp strategy options');
  }
}
