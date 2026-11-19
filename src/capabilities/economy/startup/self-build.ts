import { minerStep } from '../../mining/step';
import { selfBuildActions, selfBuildView } from './build-actions';
import { validateSelfBuild } from './build-validation';
import type { SelfBuildForecast, SelfBuildInput, SelfBuildState } from './build-model';
/** One supplied uninterrupted at-station work interval; caller supplies actual remaining service, not perpetual labor. */
export function forecastSelfBuild(input: SelfBuildInput): SelfBuildForecast {
  validateSelfBuild(input);
  const state: SelfBuildState = { ticks: 0,remainingProgress: input.remainingProgress,carriedEnergy: input.carriedEnergy,sourceEnergy: input.source.energy,
    regenerateAt: input.source.regenerationIn,harvestedEnergy: 0,overflowEnergy: 0,constructionEnergy: 0,regeneratedEnergy: 0,harvestTicks: 0,buildTicks: 0,idleTicks: 0 };
  const actions = selfBuildActions(input,state);
  while (state.remainingProgress > 0 && state.ticks < input.maximumTicks) {
    minerStep(selfBuildView(input,state),actions); regenerate(input,state); state.ticks++;
  }
  const { regenerateAt,...result } = state;
  result.idleTicks = result.ticks-result.harvestTicks-result.buildTicks;
  return { ...result,status: result.remainingProgress === 0 ? 'complete' : 'incomplete',regenerationIn: regenerateAt === null ? null : Math.max(0,regenerateAt-state.ticks) };
}
function regenerate(input: SelfBuildInput, state: SelfBuildState): void {
  if (state.sourceEnergy >= input.source.capacity) return;
  state.regenerateAt ??= state.ticks+input.source.regenerationTicks;
  if (state.ticks < state.regenerateAt-1) return;
  state.regeneratedEnergy += input.source.capacity-state.sourceEnergy;
  state.sourceEnergy = input.source.capacity; state.regenerateAt = null;
}
