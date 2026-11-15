import type { StampPlacementInput } from './stamp-placement';
export type StampReplayDraft = Pick<StampPlacementInput, 'entries' | 'corridors' | 'claimed'>;
export interface StampReplayCache {
  read(signature: string, choices: readonly number[]): StampReplayDraft | undefined;
  write(signature: string, choices: readonly number[], draft: StampReplayDraft): void;
}
/** Caller-owned single-branch heap cache. Serialized checkpoints remain the source of truth. */
export function createStampReplayCache(): StampReplayCache {
  let saved: { signature: string; choices: string; draft: StampReplayDraft } | undefined;
  return {
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
