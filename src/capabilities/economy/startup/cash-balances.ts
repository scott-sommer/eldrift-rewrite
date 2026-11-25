import type { StartupCashForecast, StartupCashInput } from './cash-model';
/** Ambient input funds cash but is not evidence that the source repaid its costs. */
export function startupHomeCashSurplus(input: Omit<StartupCashInput,'flows'>, state: StartupCashForecast): number {
  return state.endingEnergy-input.homeEnergy-(state.ambientEnergy ?? 0);
}
export function startupExpectedCash(input: Omit<StartupCashInput,'flows'>, state: StartupCashForecast): number {
  return input.homeEnergy-state.birthEnergy-state.homeConstructionEnergy-state.upkeepEnergy+state.deliveredEnergy+(state.ambientEnergy ?? 0);
}
