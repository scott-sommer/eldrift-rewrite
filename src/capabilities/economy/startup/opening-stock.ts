import { copyPlain } from '../../../core/plain-data';
import { integer, keys, record, requireCheckpoint } from './checkpoints/validation';
import type { StartupDeliveryInput, StartupDeliveryForecast } from './delivery-model';
import type { StartupOpeningState } from './initial-model';
/** Owns inventory carried by the existing miner before and during its finite service interval. */
export function createStartupOpeningStock(input: StartupDeliveryInput, delivery: StartupDeliveryForecast, checkpoint?: unknown) {
  const miner = input.initial?.miner;
  const state: StartupOpeningState = checkpoint === undefined ? { pendingMinerEnergy: miner?.energy ?? 0,minerStarted: false,minerOpeningEnergy: 0,constructionEnergyFromOpening: 0 }
    : restoreOpeningStock(input,checkpoint);
  return {
    checkpoint: () => ({ ...state }),
    activate(id: string | undefined, tick: number): void {
      if (!miner || state.minerStarted) return;
      if (tick >= miner.expiresAt) { delivery.unusedMinerCargoEnergy += state.pendingMinerEnergy; state.pendingMinerEnergy = 0; return; }
      if (id !== miner.id) return;
      delivery.minerCargoEnergy += state.pendingMinerEnergy; state.minerOpeningEnergy = state.pendingMinerEnergy;
      state.pendingMinerEnergy = 0; state.minerStarted = true;
    },
    leave(id: string | undefined): void { if (id === miner?.id) state.minerOpeningEnergy = 0; },
    built(id: string, energy: number): void {
      if (id !== miner?.id) return;
      const used = Math.min(state.minerOpeningEnergy,energy); state.constructionEnergyFromOpening += used; state.minerOpeningEnergy -= used;
    },
    spent(id: string | undefined, before: number, after: number): void {
      if (id === miner?.id) state.minerOpeningEnergy -= Math.min(state.minerOpeningEnergy,Math.max(0,before-after));
    },
    constructionCredit: () => Math.min(state.constructionEnergyFromOpening,input.project.spawning.cash.selfHarvestedConstruction),
  };
}
export function restoreOpeningStock(input: StartupDeliveryInput, value: unknown): StartupOpeningState {
  requireCheckpoint(record(value)); const saved = value as StartupOpeningState;
  requireCheckpoint(keys(value as Record<string,unknown>,['pendingMinerEnergy','minerStarted','minerOpeningEnergy','constructionEnergyFromOpening']));
  const initial = input.initial?.miner?.energy ?? 0;
  requireCheckpoint([saved.pendingMinerEnergy,saved.minerOpeningEnergy,saved.constructionEnergyFromOpening].every(value => integer(value,0,initial)));
  requireCheckpoint(typeof saved.minerStarted === 'boolean');
  requireCheckpoint(saved.pendingMinerEnergy+saved.minerOpeningEnergy+saved.constructionEnergyFromOpening <= initial);
  if (saved.minerStarted) requireCheckpoint(saved.pendingMinerEnergy === 0);
  return copyPlain(saved);
}
