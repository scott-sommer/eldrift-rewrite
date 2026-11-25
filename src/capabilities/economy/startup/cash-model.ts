export interface StartupCashReceipt { id: string; tick: number; energy: number }
export type StartupCashKind = 'birth' | 'home-construction' | 'upkeep' | 'delivery';
export interface StartupCashFlow {
  spending?: 'outside-spawn';
  id: string; kind: StartupCashKind; energy: number; firstTick: number; interval: number | null; occurrences: number;
}
export interface StartupCashInput {
  homeEnergy: number; protectedEnergy: number; horizon: number; readyAt: number;
  /** Recovery benchmark for construction paid from remote harvest; never debited from initial home cash. */
  openingAssets?: number;
  selfHarvestedConstruction: number; flows: readonly StartupCashFlow[];
}
export interface StartupCashForecast {
  /** Native ambient input: spendable after settlement, excluded from source surplus/recovery. */
  ambientEnergy?: number;
  endingEnergy: number; minimumEnergy: number; minimumAt: number; requiredHomeEnergy: number; homeShortfall: number;
  birthEnergy: number; homeConstructionEnergy: number; upkeepEnergy: number; deliveredEnergy: number;
  homeCashSurplus: number; constructionRecoveryMargin: number; firstDeliveryAt: number | null; firstRecoveryAt: number | null;
}
