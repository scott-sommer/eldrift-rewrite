import { createImmutableJsonCache } from '../../core/immutable-json-cache';
import type { StampPlacementInput } from './stamp-placement';
export type StampReplayDraft = Pick<StampPlacementInput, 'entries' | 'corridors' | 'claimed'>;
export interface StampReplayCache {
  stringify?: (value: unknown) => string | undefined;
  read(signature: string, choices: readonly number[]): StampReplayDraft | undefined;
  readPrefix?(signature: string, choices: readonly number[]): { depth: number; draft: StampReplayDraft } | undefined;
  write(signature: string, choices: readonly number[], draft: StampReplayDraft): void;
}
interface CachedBranch { signature: string; choices: number[]; draft: StampReplayDraft }
/** Caller-owned single-branch heap cache. Serialized checkpoints remain the source of truth. */
export function createStampReplayCache(): StampReplayCache {
  let saved: CachedBranch | undefined;
  return {
    stringify: createImmutableJsonCache(),
    read(signature, choices) {
      if (!matchesPrefix(saved, signature, choices) || saved.choices.length !== choices.length) return undefined;
      return copyDraft(saved.draft);
    },
    readPrefix(signature, choices) {
      if (!matchesPrefix(saved, signature, choices)) return undefined;
      return { depth: saved.choices.length, draft: copyDraft(saved.draft) };
    },
    write(signature, choices, draft) {
      saved = { signature, choices: [...choices], draft: copyDraft(draft) };
    },
  };
}
function copyDraft(draft: StampReplayDraft): StampReplayDraft {
  return JSON.parse(JSON.stringify(draft)) as StampReplayDraft;
}

function matchesPrefix(saved: CachedBranch | undefined, signature: string, choices: readonly number[]): saved is CachedBranch {
  return !!saved && saved.signature === signature && saved.choices.length <= choices.length
    && saved.choices.every((value, index) => value === choices[index]);
}
