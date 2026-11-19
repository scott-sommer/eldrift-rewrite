import { startupFlowDue } from './flow';
import { validateStartupCash } from './cash-validation';
import type { StartupCashForecast, StartupCashInput, StartupCashFlow } from './cash-model';
/** Explicit finite schedules; costs precede same-frame receipts, which cannot fund an earlier native admission. */
export function forecastStartupCash(input: StartupCashInput): StartupCashForecast {
  validateStartupCash(input);
  const result: StartupCashForecast = { endingEnergy: input.homeEnergy,minimumEnergy: input.homeEnergy,minimumAt: 0,requiredHomeEnergy: 0,homeShortfall: 0,
    birthEnergy: 0,homeConstructionEnergy: 0,upkeepEnergy: 0,deliveredEnergy: 0,homeCashSurplus: 0,constructionRecoveryMargin: -input.selfHarvestedConstruction,firstDeliveryAt: null,firstRecoveryAt: null };
  for (let tick = 0; tick <= input.horizon; tick++) {
    const flows = input.flows.filter(flow => startupFlowDue(flow,tick));
    spend(result,flows);
    if (result.endingEnergy < result.minimumEnergy) { result.minimumEnergy = result.endingEnergy; result.minimumAt = tick; }
    receive(result,input,flows,tick);
  }
  result.requiredHomeEnergy = input.protectedEnergy+input.homeEnergy-result.minimumEnergy;
  result.homeShortfall = Math.max(0,result.requiredHomeEnergy-input.homeEnergy);
  return result;
}
function spend(result: StartupCashForecast, flows: readonly StartupCashFlow[]): void {
  for (const flow of flows) {
    if (flow.kind === 'delivery') continue;
    result.endingEnergy -= flow.energy;
    if (flow.kind === 'birth') result.birthEnergy += flow.energy;
    else if (flow.kind === 'home-construction') result.homeConstructionEnergy += flow.energy;
    else result.upkeepEnergy += flow.energy;
  }
}

function receive(result: StartupCashForecast, input: StartupCashInput, flows: readonly StartupCashFlow[], tick: number): void {
  const delivered = flows.filter(flow => flow.kind === 'delivery').reduce((sum,flow) => sum+flow.energy,0);
  result.endingEnergy += delivered; result.deliveredEnergy += delivered;
  if (delivered > 0) result.firstDeliveryAt ??= tick;
  result.homeCashSurplus = result.endingEnergy-input.homeEnergy;
  result.constructionRecoveryMargin = result.homeCashSurplus-input.selfHarvestedConstruction;
  if (tick >= input.readyAt && result.firstDeliveryAt !== null && result.constructionRecoveryMargin >= 0) result.firstRecoveryAt ??= tick;
}
