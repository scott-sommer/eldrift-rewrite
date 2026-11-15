import { createImmutableJsonCache } from '../../core/immutable-json-cache';
import type { StampPlacementInput } from './stamp-placement';
export type StampReplayDraft = Pick<StampPlacementInput, 'entries' | 'corridors' | 'claimed'>;
export interface StampReplayCache {
  stringify?: (value: unknown) => string | undefined;
  read(signature: string, choices: readonly number[]): StampReplayDraft | undefined;
  write(signature: string, choices: readonly number[], draft: StampReplayDraft): void;
}
/** Caller-owned single-branch heap cache. Serialized checkpoints remain the source of truth. */
export function createStampReplayCache(): StampReplayCache {
  let saved: { signature: string; choices: string; draft: StampReplayDraft } | undefined;
  return {
    stringify: createImmutableJsonCache(),
    read(signature, choices) {
      if (saved?.signature !== signature || saved.choices !== JSON.stringify(choices)) return undefined;
      return copyDraft(saved.draft);
    },
    write(signature, choices, draft) {
      saved = { signature, choices: JSON.stringify(choices), draft: copyDraft(draft) };
    },
  };
}
function copyDraft(draft: StampReplayDraft): StampReplayDraft {
  return JSON.parse(JSON.stringify(draft)) as StampReplayDraft;
}
