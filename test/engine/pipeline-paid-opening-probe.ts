import { observePipelinePaidOpening } from './pipeline-paid-courier-probe';
import type { StatePort } from '../../src/persistence/versioned-state';
type Openings = NonNullable<ReturnType<typeof observePipelinePaidOpening>>['openings'];
interface OpeningMemory extends Memory { pipelinePaidOpeningResolutions?: { tick: number; openings: Openings }[] }
/** Called before runtime actors, while preceding-frame effects are visible and journals still own bookkeeping. */
export function capturePipelinePaidOpening(state: StatePort): void {
  if (Game.time < 150 || Game.time > 155) return;
  const result = observePipelinePaidOpening(state,true); if (!result) return;
  ((Memory as OpeningMemory).pipelinePaidOpeningResolutions ??= []).push({ tick: Game.time,openings: result.openings });
}
