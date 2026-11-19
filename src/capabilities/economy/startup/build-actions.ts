import { energyHarvestEffect } from '../../mining/harvest-effect';
import type { MinerPorts, MinerView } from '../../mining/step';
import type { SelfBuildInput, SelfBuildState } from './build-model';
export function selfBuildView(input: SelfBuildInput, state: SelfBuildState): MinerView {
  return { tick: state.ticks,spawning: false,unsafe: false,target: 'visible',assigned: true,atStation: true,
    carried: state.carriedEnergy,energy: state.carriedEnergy,freeCapacity: input.carryCapacity-state.carriedEnergy,
    carryCapacity: input.carryCapacity,establish: state.remainingProgress > 0,repair: false,
    ...(state.sourceEnergy === 0 ? { readiness: { status: 'blocked' as const,reason: 'source-depleted',retryAt: state.ticks+1 } } : {}) };
}
/** Local projected effects, using the same action selection as actual mining. Unboosted progress costs one energy. */
export function selfBuildActions(input: SelfBuildInput, state: SelfBuildState): MinerPorts {
  const unexpected = (): never => { throw new Error('Unexpected action in self-build forecast'); };
  return { approach: unexpected,retreat: unexpected,repair: unexpected,handoff: unexpected,rejected: unexpected,
    establish() {
      const amount = Math.min(input.buildPower,state.carriedEnergy,state.remainingProgress);
      state.carriedEnergy -= amount; state.remainingProgress -= amount; state.constructionEnergy += amount;
      if (amount > 0) state.buildTicks++;
      return { status: 'running' };
    },
    harvest() {
      const effect = energyHarvestEffect(input.harvestPower,state.sourceEnergy,state.carriedEnergy,input.carryCapacity);
      state.sourceEnergy -= effect.harvestedEnergy; state.carriedEnergy = effect.carriedEnergy;
      state.harvestedEnergy += effect.harvestedEnergy; state.overflowEnergy += effect.overflowEnergy;
      if (effect.harvestedEnergy > 0) state.harvestTicks++;
      return { status: 'issued',code: 0 };
    } };
}
