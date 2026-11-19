import { energyHarvestEffect } from '../../mining/harvest-effect';
import { minerStep } from '../../mining/step';
import type { StartupBuildWave } from './construction-model';
import type { StartupDeliveryForecast } from './delivery-model';
/** Same action selector as execution; local effects only, with handoff committed after courier collection. */
export function startupMiningFrame(result: StartupDeliveryForecast, wave: StartupBuildWave | undefined, tick: number, capacity: number): number {
  if (!wave) return 0;
  let deposit = 0;
  const impossible = (): never => { throw new Error('Unexpected startup mining action'); };
  const energy = result.minerCargoEnergy;
  minerStep({ tick,spawning: false,unsafe: false,target: 'visible',assigned: true,atStation: true,carried: energy,energy,
    carryCapacity: wave.carryCapacity,freeCapacity: wave.carryCapacity-energy,establish: false,repair: false,
    ...(result.source.energy === 0 ? { readiness: { status: 'blocked' as const,reason: 'source-depleted',retryAt: tick+1 } } : {}) },{
    approach: impossible,retreat: impossible,establish: impossible,repair: impossible,rejected: impossible,
    handoff() {
      deposit = Math.min(energy,capacity-result.containerEnergy); result.minerCargoEnergy -= deposit;
      return { status: 'issued',code: 0 };
    },
    harvest() {
      const effect = energyHarvestEffect(wave.harvestPower,result.source.energy,energy,wave.carryCapacity);
      result.source.energy -= effect.harvestedEnergy; result.minerCargoEnergy = effect.carriedEnergy; result.harvestedEnergy += effect.harvestedEnergy;
      deposit = Math.min(effect.overflowEnergy,capacity-result.containerEnergy);
      result.overflowEnergy += effect.overflowEnergy; result.uncapturedOverflowEnergy += effect.overflowEnergy-deposit;
      return { status: 'issued',code: 0 };
    },
  });
  return deposit;
}
