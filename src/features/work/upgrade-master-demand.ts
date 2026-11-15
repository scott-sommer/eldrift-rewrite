export interface UpgradeMasterDemandView { owned: boolean; level: number; storageEnergy?: number; terminal: boolean }
/** Legacy spawner.js: strict retained-stock threshold, or storage plus terminal at RCL6+. */
export function needsUpgradeMaster(view: UpgradeMasterDemandView, storageThreshold: number): boolean {
  if (!Number.isSafeInteger(storageThreshold) || storageThreshold < 0) throw new Error('Invalid master storage threshold');
  if (!view.owned || view.storageEnergy === undefined) return false;
  return view.storageEnergy > storageThreshold || view.level >= 6 && view.terminal;
}
