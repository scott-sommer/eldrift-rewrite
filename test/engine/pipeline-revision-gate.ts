import type { StatePort } from '../../src/persistence/versioned-state';
/** Passive fixture scheduling only. Every genuine owner write advances its revision; no financial authority is cached. */
export function createPipelineRevisionGate(key: string, owner: string, version: number) {
  let previous: string | undefined;
  return (state: StatePort): boolean => {
    const raw = state.read(key) as { owner?: unknown; version?: unknown; data?: { revision?: number; clock?: number } } | undefined;
    if (raw && (raw.owner !== owner || raw.version !== version)) throw new Error('Fixture observation owner/version mismatch');
    if (raw && (!Number.isSafeInteger(raw.data?.revision) || !Number.isSafeInteger(raw.data?.clock))) throw new Error('Fixture observation revision/clock mismatch');
    const next = raw ? JSON.stringify([raw.data!.revision,raw.data!.clock]) : 'absent';
    if (next === previous) return false;
    previous = next; return true;
  };
}
