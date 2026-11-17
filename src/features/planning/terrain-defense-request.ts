import { copyPlain } from '../../persistence/plain-data';
import { createTerrainCutDefense } from '../../capabilities/planning/terrain-cut-defense';
import type { TerrainCutDefenseInput } from '../../capabilities/planning/terrain-cut-defense';
import type { FlowCheckpoint } from '../../core/recoverable-flow';
import { compactSequence } from '../../capabilities/planning/draft-revision';
export interface TerrainDefenseCheckpoint { version: 1; identity: string; flow?: FlowCheckpoint }
/** Request owner preserves the last valid flow checkpoint while preparation or replay yields. */
export function createTerrainDefenseRequest(source: TerrainCutDefenseInput, previous?: TerrainDefenseCheckpoint) {
  const input = copyPlain(source);
  const identity = terrainDefenseIdentity(input);
  if (previous && (previous.version !== 1 || previous.identity !== identity)) throw new Error('Stale terrain defense request');
  const checkpoint: TerrainDefenseCheckpoint = previous ? copyPlain(previous) : { version: 1, identity };
  const search = createTerrainCutDefense(input, checkpoint.flow);
  return { advance(augmentations: number, guard: () => boolean, scans: number) {
    const result = search.advance(augmentations, guard, scans);
    if ('checkpoint' in result && result.checkpoint) checkpoint.flow = copyPlain(result.checkpoint);
    return { result, checkpoint: copyPlain(checkpoint) };
  } };
}

export function terrainDefenseIdentity(input: TerrainCutDefenseInput): string {
  return JSON.stringify(['terrain-defense-request-v1', {
    ...input, observation: { ...input.observation, terrain: compactSequence(input.observation.terrain) },
  }]);
}
