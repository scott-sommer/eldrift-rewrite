import { copyPlain } from '../../persistence/plain-data';
import type { StagedTile } from '../../capabilities/planning/template';
export type GeneratedDefense = { id: string; status: 'complete'; barriers: StagedTile[] }
  | { id: string; status: 'rejected'; reason: string };
export interface DefenseCoordinatorCheckpoint { version: 1; identity: string; generated: GeneratedDefense[] }
/** Persist geometry, never trusted evaluation scores; restoration revalidates each finished candidate. */
export function restoreDefenseCoordinator(identity: string, ids: readonly string[], saved?: DefenseCoordinatorCheckpoint): GeneratedDefense[] {
  if (!saved) return [];
  const state = copyPlain(saved);
  if (state.version !== 1 || state.identity !== identity || !Array.isArray(state.generated)) throw new Error('Stale defense coordinator');
  if (state.generated.length > ids.length) throw new Error('Invalid defense progress');
  state.generated.forEach((result, index) => {
    if (!result || result.id !== ids[index]) throw new Error('Invalid defense progress order');
    if (result.status === 'complete') validateBarriers(result.barriers);
    else if (result.status !== 'rejected' || typeof result.reason !== 'string') throw new Error('Invalid defense result');
  });
  return state.generated;
}
function validateBarriers(barriers: StagedTile[]): void {
  if (!Array.isArray(barriers) || barriers.length > 2500) throw new Error('Invalid defense barriers');
  for (const barrier of barriers) {
    if (!barrier || !['rampart', 'constructedWall'].includes(barrier.type)) throw new Error('Invalid defense barrier');
    const position = barrier.position;
    if (!position || ![position.x, position.y].every(value => Number.isInteger(value) && value >= 0 && value < 50)) {
      throw new Error('Invalid defense position');
    }
  }
}
