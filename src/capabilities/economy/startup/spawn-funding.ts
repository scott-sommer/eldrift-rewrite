import { startupFlowDue } from './flow';
import type { StartupSpawnFunding } from './spawn-model';
/** Ephemeral forecast quantities, not a persistent claim owner. Refills move existing bank energy only. */
export function createStartupSpawnFunding(input: StartupSpawnFunding, homeEnergy: number) {
  let bank = homeEnergy, accessible = input.initialEnergy, refilledEnergy = 0, unfilledEnergy = 0;
  return {
    available(reserve: number): number { return Math.max(0,Math.min(accessible,bank-reserve)); },
    spend(energy: number): void {
      bank -= energy;
      // External expenses conservatively consume accessible stock first when their physical pool is unspecified.
      accessible = Math.max(0,accessible-energy);
    },
    receive(energy: number): void { bank += energy; },
    refill(tick: number): void {
      for (const flow of input.refills) {
        if (!startupFlowDue({ ...flow,kind: 'delivery' },tick)) continue;
        const moved = Math.max(0,Math.min(flow.energy,input.capacity-accessible,bank-accessible));
        accessible += moved; refilledEnergy += moved; unfilledEnergy += flow.energy-moved;
      }
    },
    result() { return { endingSpawnEnergy: accessible,refilledEnergy,unfilledEnergy }; },
  };
}
