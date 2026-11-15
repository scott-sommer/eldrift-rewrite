import { placeStamp } from './stamp-placement';
import type { LayoutStamp, StampPlacementInput } from './stamp-placement';
import type { Tile } from '../../core/geometry/local-grid';
import type { TransformIndex } from '../../core/geometry/transforms';
import { validateLayoutCapacity } from './capacity-validation';
import type { StructureLimits } from './core-model';
export interface StampCompositionInput extends Omit<StampPlacementInput, 'stamp' | 'anchor' | 'transform'> {
  revision: string; stamps: readonly LayoutStamp[]; anchors: readonly Tile[]; limits: StructureLimits;
}
export interface StampCompositionCheckpoint {
  version: 1; signature: string; choices: number[]; cursors: number[];
  exhausted: boolean; lastReason?: string;
}
type Draft = Pick<StampPlacementInput, 'entries' | 'corridors' | 'claimed'>;
/** Depth-first search with compact branch cursors; drafts are reconstructed, never trusted from memory. */
export function composeStamps(
  input: StampCompositionInput, previous: StampCompositionCheckpoint | undefined,
  maximumAttempts: number, guard: () => boolean = () => true,
) {
  const checkpoint = restore(input, previous, maximumAttempts);
  let draft = replay(input, checkpoint.choices, guard), attempts = 0;
  while (draft && !checkpoint.exhausted && checkpoint.choices.length < input.stamps.length
    && attempts < maximumAttempts && guard()) {
    const depth = checkpoint.choices.length, ordinal = checkpoint.cursors[depth]!;
    if (ordinal >= input.anchors.length * 8) {
      if (!depth) { checkpoint.exhausted = true; break; }
      checkpoint.choices.pop(); checkpoint.cursors.pop();
      draft = replay(input, checkpoint.choices, guard);
      continue;
    }
    checkpoint.cursors[depth] = ordinal + 1; attempts++;
    const placed = attempt(input, draft, depth, ordinal);
    if (!placed.ok) { checkpoint.lastReason = placed.reason; continue; }
    checkpoint.choices.push(ordinal); checkpoint.cursors.push(0);
    draft = placed.draft;
  }
  const done = !!draft && checkpoint.choices.length === input.stamps.length;
  return { checkpoint, attempts, status: done ? 'complete' as const
    : checkpoint.exhausted ? 'rejected' as const : 'pending' as const,
    ...(done ? { entries: draft!.entries, corridors: draft!.corridors } : {}) };
}
function attempt(input: StampCompositionInput, draft: Draft, depth: number, ordinal: number) {
  const placed = placeStamp({ ...input, ...draft, stamp: input.stamps[depth]!,
    anchor: input.anchors[Math.floor(ordinal / 8)]!, transform: (ordinal % 8) as TransformIndex });
  if (!placed.ok) return placed;
  const failures = validateLayoutCapacity(placed.entries, input.limits);
  if (failures.length) return { ok: false as const, reason: JSON.stringify(failures[0]) };
  return { ok: true as const, draft: { entries: placed.entries, claimed: placed.claimed,
    corridors: [...draft.corridors, ...placed.ports] } };
}
function replay(input: StampCompositionInput, choices: readonly number[], guard: () => boolean): Draft | undefined {
  let draft: Draft = { entries: input.entries, corridors: input.corridors, claimed: input.claimed ?? [] };
  for (let depth = 0; depth < choices.length; depth++) {
    if (!guard()) return undefined;
    const placed = attempt(input, draft, depth, choices[depth]!);
    if (!placed.ok) throw new Error('Invalid stamp composition branch');
    draft = placed.draft;
  }
  return draft;
}
function restore(input: StampCompositionInput, saved: StampCompositionCheckpoint | undefined, budget: number) {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new Error('Invalid composition budget');
  if (!input.revision || input.stamps.length > 64 || input.anchors.length > 2500) throw new Error('Invalid composition input');
  const signature = JSON.stringify(['stamp-composition-v1', input.revision, input.stamps, input.anchors,
    input.entries, input.corridors, input.claimed ?? [], input.limits]);
  if (!saved) return { version: 1 as const, signature, choices: [], cursors: [0], exhausted: false };
  validateSaved(saved, signature, input.stamps.length, input.anchors.length * 8);
  return { ...saved, choices: [...saved.choices], cursors: [...saved.cursors] };
}
function validateSaved(saved: StampCompositionCheckpoint, signature: string, depth: number, count: number): void {
  if (saved.version !== 1 || saved.signature !== signature || typeof saved.exhausted !== 'boolean') throw new Error('Stale composition');
  if (!validShape(saved, depth)) throw new Error('Invalid composition cursor');
  if (!saved.cursors.every(value => Number.isSafeInteger(value) && value >= 0 && value <= count)) throw new Error('Invalid composition cursor');
  if (!validChoices(saved, count)) throw new Error('Invalid composition choice');
  if (saved.exhausted && (saved.choices.length || saved.cursors[0] !== count)) throw new Error('Invalid exhausted composition');
}

function validChoices(saved: StampCompositionCheckpoint, count: number): boolean {
  return saved.choices.every((value, index) => Number.isSafeInteger(value) && value >= 0
    && value < count && saved.cursors[index] === value + 1);
}

function validShape(saved: StampCompositionCheckpoint, depth: number): boolean {
  return Array.isArray(saved.choices) && saved.choices.length <= depth
    && Array.isArray(saved.cursors) && saved.cursors.length === saved.choices.length + 1;
}
