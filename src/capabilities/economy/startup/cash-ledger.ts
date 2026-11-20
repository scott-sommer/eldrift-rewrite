import { restoreCashCheckpoint } from './checkpoints/cash';
import { validateStartupCash } from './cash-validation';
import type { StartupCashInput, StartupCashForecast, StartupCashFlow } from './cash-model';
/** Statistical accounting only; physical funding/claims remain owned by the caller. */
export function createStartupCashLedger(input: Omit<StartupCashInput,'flows'>, checkpoint?: unknown) { return new StartupCashLedger(input,checkpoint); }
class StartupCashLedger {
  private readonly input;
  private state: StartupCashForecast;
  private tick = 0;
  private openingConstructionEnergy = 0;
  constructor(input: Omit<StartupCashInput,'flows'>, checkpoint?: unknown) {
    validateStartupCash({ ...input,flows: [] }); this.input = { ...input };
    this.state = { endingEnergy: input.homeEnergy,minimumEnergy: input.homeEnergy,minimumAt: 0,requiredHomeEnergy: 0,homeShortfall: 0,
      birthEnergy: 0,homeConstructionEnergy: 0,upkeepEnergy: 0,deliveredEnergy: 0,homeCashSurplus: 0,constructionRecoveryMargin: -input.selfHarvestedConstruction-(input.openingAssets ?? 0),firstDeliveryAt: null,firstRecoveryAt: null };
    if (checkpoint !== undefined) { const saved = restoreCashCheckpoint(input,checkpoint); this.state = saved.state; this.tick = saved.tick; this.openingConstructionEnergy = saved.openingConstructionEnergy; }
  }
  frame(tick: number, flows: readonly StartupCashFlow[], credit = 0, ready = true, openingConstructionEnergy = this.openingConstructionEnergy): void {
    if (tick !== this.tick || tick > this.input.horizon) throw new Error('Startup cash frame order');
    validateFrame(flows,credit);
    validateOpeningCredit(this.input,openingConstructionEnergy,this.openingConstructionEnergy);
    const next = { ...this.state };
    spend(next,flows);
    if (next.endingEnergy < next.minimumEnergy) { next.minimumEnergy = next.endingEnergy; next.minimumAt = tick; }
    const delivered = credit+flows.filter(flow => flow.kind === 'delivery').reduce((sum,flow) => sum+flow.energy,0);
    receive(next,this.input,delivered,tick,ready,openingConstructionEnergy);
    if (!Object.values(next).every(value => value === null || Number.isSafeInteger(value))) throw new Error('Startup cash arithmetic overflow');
    this.state = next; this.openingConstructionEnergy = openingConstructionEnergy; this.tick++;
  }
  checkpoint() { return { tick: this.tick,state: { ...this.state },openingConstructionEnergy: this.openingConstructionEnergy }; }
  through(): number { return this.tick; }
  result(): StartupCashForecast {
    if (this.tick !== this.input.horizon+1) throw new Error('Startup cash accounting incomplete');
    const requiredHomeEnergy = this.input.protectedEnergy+this.input.homeEnergy-this.state.minimumEnergy;
    return { ...this.state,requiredHomeEnergy,homeShortfall: Math.max(0,requiredHomeEnergy-this.input.homeEnergy) };
  }
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
function validateFrame(flows: readonly StartupCashFlow[], credit: number): void {
  if (flows.length > 144 || !Number.isSafeInteger(credit) || credit < 0) throw new Error('Invalid startup cash frame');
  for (const flow of flows) {
    if (!['birth','home-construction','upkeep','delivery'].includes(flow.kind) || !Number.isSafeInteger(flow.energy) || flow.energy < 0 || flow.energy > 1000000) throw new Error('Invalid startup cash effect');
  }
}

function receive(result: StartupCashForecast, input: Omit<StartupCashInput,'flows'>, delivered: number, tick: number, ready: boolean, openingConstructionEnergy: number): void {
  result.endingEnergy += delivered; result.deliveredEnergy += delivered;
  if (delivered > 0) result.firstDeliveryAt ??= tick;
  result.homeCashSurplus = result.endingEnergy-input.homeEnergy;
  result.constructionRecoveryMargin = result.homeCashSurplus-input.selfHarvestedConstruction-(input.openingAssets ?? 0)+openingConstructionEnergy;
  if (canRecover(result,input,tick,ready)) result.firstRecoveryAt ??= tick;
}

function validateOpeningCredit(input: Omit<StartupCashInput,'flows'>, value: number, previous: number): void {
  if (!Number.isSafeInteger(value) || value < previous || value > Math.min(input.openingAssets ?? 0,input.selfHarvestedConstruction)) throw new Error('Invalid startup opening construction credit');
}

function canRecover(result: StartupCashForecast, input: Omit<StartupCashInput,'flows'>, tick: number, ready: boolean): boolean {
  return ready && tick >= input.readyAt && result.firstDeliveryAt !== null && result.constructionRecoveryMargin >= 0;
}
