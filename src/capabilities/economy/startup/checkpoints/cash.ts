import { copyPlain } from '../../../../core/plain-data';
import { integer, keys, numbers, record, requireCheckpoint, time } from './validation';
import type { StartupCashForecast, StartupCashInput } from '../cash-model';
export interface StartupCashCheckpoint { tick: number; state: StartupCashForecast; openingConstructionEnergy: number }
const counters = ['birthEnergy','homeConstructionEnergy','upkeepEnergy','deliveredEnergy','requiredHomeEnergy','homeShortfall'];
const balances = ['endingEnergy','minimumEnergy','homeCashSurplus','constructionRecoveryMargin'];
export function restoreCashCheckpoint(input: Omit<StartupCashInput,'flows'>, value: unknown): StartupCashCheckpoint {
  requireCheckpoint(record(value));
  const raw = value as StartupCashCheckpoint;
  const saved = { ...raw,openingConstructionEnergy: raw.openingConstructionEnergy === undefined ? 0 : raw.openingConstructionEnergy };
  requireCheckpoint(integer(saved.openingConstructionEnergy,0,Math.min(input.openingAssets ?? 0,input.selfHarvestedConstruction)));
  requireCheckpoint(integer(saved.tick,0,input.horizon+1) && record(saved.state));
  requireCheckpoint(validState(saved.state,saved.tick,input,saved.openingConstructionEnergy));
  return copyPlain(saved);
}
function validState(state: StartupCashForecast, tick: number, input: Omit<StartupCashInput,'flows'>, openingConstructionEnergy: number): boolean {
  const data = state as unknown as Record<string,unknown>;
  if (!keys(data,[...counters,...balances,'minimumAt','firstDeliveryAt','firstRecoveryAt'])) return false;
  if (!numbers(data,counters) || !numbers(data,balances,-Number.MAX_SAFE_INTEGER)) return false;
  if (!validTimes(state,tick)) return false;
  if (state.requiredHomeEnergy !== 0 || state.homeShortfall !== 0) return false;
  if (state.minimumEnergy > Math.min(input.homeEnergy,state.endingEnergy)) return false;
  if (state.endingEnergy !== input.homeEnergy-state.birthEnergy-state.homeConstructionEnergy-state.upkeepEnergy+state.deliveredEnergy) return false;
  return validSurplus(state,tick,input,openingConstructionEnergy);
}
function validSurplus(state: StartupCashForecast, tick: number, input: Omit<StartupCashInput,'flows'>, openingConstructionEnergy: number): boolean {
  if (tick === 0) return state.homeCashSurplus === 0 && state.constructionRecoveryMargin === -input.selfHarvestedConstruction-(input.openingAssets ?? 0);
  return state.homeCashSurplus === state.endingEnergy-input.homeEnergy && state.constructionRecoveryMargin === state.homeCashSurplus-input.selfHarvestedConstruction-(input.openingAssets ?? 0)+openingConstructionEnergy;
}

function validTimes(state: StartupCashForecast, tick: number): boolean {
  return integer(state.minimumAt,0,Math.max(0,tick-1)) && time(state.firstDeliveryAt,tick) && time(state.firstRecoveryAt,tick);
}
