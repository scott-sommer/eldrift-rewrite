import { framedIdentity } from '../../core/framed-identity';
import type { StampReplayCache } from './stamp-replay-cache';
import { insideRoom } from '../../core/geometry/local-grid';
import { placeStamp } from './stamp-placement';
import type { LayoutStamp, StampPlacementInput } from './stamp-placement';
import type { Tile } from '../../core/geometry/local-grid';
import type { TransformIndex } from '../../core/geometry/transforms';
import { validateLayoutCapacity } from './capacity-validation';
import type { StructureLimits } from './core-model';
export interface StampCompositionInput extends Omit<StampPlacementInput, 'stamp' | 'anchor' | 'transform'> {
  maximumTotalAttempts?: number;
  anchorsByStamp?: readonly (readonly Tile[])[];
  revision: string; stamps: readonly LayoutStamp[]; anchors: readonly Tile[]; limits: StructureLimits;
}
export interface StampCompositionCheckpoint {
  version: 2; totalAttempts: number; signature: string; choices: number[]; cursors: number[];
  exhausted: boolean; lastReason?: string;
}
type Draft = Pick<StampPlacementInput, 'entries' | 'corridors' | 'claimed'>;
/** Depth-first search with compact branch cursors; drafts are reconstructed, never trusted from memory. */
export function composeStamps(
  input: StampCompositionInput, previous: StampCompositionCheckpoint | undefined,
  maximumAttempts: number, guard: () => boolean = () => true, cache?: StampReplayCache,
) {
  const checkpoint = restore(input, previous, maximumAttempts);
  let draft = cachedReplay(input, checkpoint, guard, cache), attempts = 0;
  while (draft && !checkpoint.exhausted && checkpoint.choices.length < input.stamps.length
    && attempts < maximumAttempts && checkpoint.totalAttempts < totalLimit(input) && guard()) {
    const depth = checkpoint.choices.length, ordinal = checkpoint.cursors[depth]!;
    if (ordinal >= anchorsAt(input, depth).length * 8) {
      if (!depth) { checkpoint.exhausted = true; break; }
      checkpoint.choices.pop(); checkpoint.cursors.pop();
      draft = replay(input, checkpoint.choices, guard);
      continue;
    }
    checkpoint.cursors[depth] = ordinal + 1; attempts++; checkpoint.totalAttempts++;
    const placed = attempt(input, draft, depth, ordinal);
    if (!placed.ok) { checkpoint.lastReason = placed.reason; continue; }
    checkpoint.choices.push(ordinal); checkpoint.cursors.push(0);
    draft = placed.draft;
  }
  if (draft) cache?.write(checkpoint.signature, checkpoint.choices, draft);
  return compositionResult(input, checkpoint, draft, attempts);
}
function compositionResult(input: StampCompositionInput, checkpoint: StampCompositionCheckpoint, draft: Draft | undefined, attempts: number) {
  const done = !!draft && checkpoint.choices.length === input.stamps.length;
  const limited = checkpoint.totalAttempts >= totalLimit(input);
  const rejected = checkpoint.exhausted || limited;
  return { checkpoint, attempts, status: done ? 'complete' as const
    : rejected ? 'rejected' as const : 'pending' as const,
    ...(done ? { entries: draft!.entries, corridors: draft!.corridors } : {}),
    ...(!done && limited ? { reason: 'search-limit' as const } : {}) };
}

function attempt(input: StampCompositionInput, draft: Draft, depth: number, ordinal: number) {
  const placed = placeStamp({ ...input, ...draft, stamp: input.stamps[depth]!,
    anchor: anchorsAt(input, depth)[Math.floor(ordinal / 8)]!, transform: (ordinal % 8) as TransformIndex });
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
  validateAnchors(input);
  const signature = compositionSignature(input);
  if (!saved) return { version: 2 as const, totalAttempts: 0, signature, choices: [], cursors: [0], exhausted: false };
  validateSaved(saved, signature, input.stamps.map((_, depth) => anchorsAt(input, depth).length * 8));
  validateTotal(saved, totalLimit(input));
  return { ...saved, choices: [...saved.choices], cursors: [...saved.cursors] };
}
function validateSaved(saved: StampCompositionCheckpoint, signature: string, counts: readonly number[]): void {
  if (saved.version !== 2 || saved.signature !== signature || typeof saved.exhausted !== 'boolean') throw new Error('Stale composition');
  if (!validShape(saved, counts.length)) throw new Error('Invalid composition cursor');
  if (!validCursors(saved.cursors, counts)) throw new Error('Invalid composition cursor');
  if (!validChoices(saved, counts)) throw new Error('Invalid composition choice');
  validateExhausted(saved, counts[0] ?? 0);
}

function validChoices(saved: StampCompositionCheckpoint, counts: readonly number[]): boolean {
  return saved.choices.every((value, index) => Number.isSafeInteger(value) && value >= 0
    && value < counts[index]! && saved.cursors[index] === value + 1);
}

function validShape(saved: StampCompositionCheckpoint, depth: number): boolean {
  return Array.isArray(saved.choices) && saved.choices.length <= depth
    && Array.isArray(saved.cursors) && saved.cursors.length === saved.choices.length + 1;
}

function totalLimit(input: StampCompositionInput): number {
  const limit = input.maximumTotalAttempts ?? 100000;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000000) throw new Error('Invalid total search limit');
  return limit;
}

function validateTotal(saved: StampCompositionCheckpoint, limit: number): void {
  if (!Number.isSafeInteger(saved.totalAttempts) || saved.totalAttempts < saved.choices.length
    || saved.totalAttempts > limit) throw new Error('Invalid composition total');
}

function anchorsAt(input: StampCompositionInput, depth: number): readonly Tile[] {
  return input.anchorsByStamp?.[depth] ?? input.anchors;
}
function validateAnchors(input: StampCompositionInput): void {
  if (input.anchorsByStamp && input.anchorsByStamp.length !== input.stamps.length) throw new Error('Invalid stamp anchor lists');
  const lists = input.anchorsByStamp ?? [input.anchors];
  if (lists.some(list => list.length > 2500 || !list.every(tile => insideRoom(tile)))) throw new Error('Invalid stamp anchors');
}

function compositionSignature(input: StampCompositionInput): string {
  return framedIdentity(['stamp-composition-v4', input.revision, JSON.stringify([input.stamps, input.anchors,
    input.entries, input.corridors, input.claimed ?? [], input.limits, totalLimit(input), input.anchorsByStamp ?? null])]);
}

function validCursors(cursors: readonly number[], counts: readonly number[]): boolean {
  return cursors.every((value, index) => Number.isSafeInteger(value) && value >= 0 && value <= (counts[index] ?? 0));
}

function validateExhausted(saved: StampCompositionCheckpoint, count: number): void {
  if (saved.exhausted && (saved.choices.length || saved.cursors[0] !== count)) throw new Error('Invalid exhausted composition');
}

function cachedReplay(input: StampCompositionInput, checkpoint: StampCompositionCheckpoint,
  guard: () => boolean, cache?: StampReplayCache): Draft | undefined {
  if (!cache) return replay(input, checkpoint.choices, guard);
  if (!guard()) return undefined;
  return cache.read(checkpoint.signature, checkpoint.choices) ?? replay(input, checkpoint.choices, guard);
}
