export interface UpgradeBootstrapView {
  owned: boolean;
  level: number;
  storageEnergy?: number;
  terminal: boolean;
  progressRemaining: number;
  upgraders: number;
}
export interface UpgradeBootstrapPolicy { enabled: boolean; fleetActive: boolean; storageFloor: number; workers: number; haulers: number }
export interface UpgradeBootstrapDemand { workers: number; haulers: number }
export function upgradeBootstrapDemand(view: UpgradeBootstrapView, policy: UpgradeBootstrapPolicy): UpgradeBootstrapDemand {
  const stopped = { workers: 0, haulers: 0 };
  if (!policy.enabled || !policy.fleetActive || !view.owned || view.level >= 8) return stopped;
  // A terminal without storage cannot support the mature ring: bootstrap it too.
  const bootstrap = view.storageEnergy === undefined || view.storageEnergy < policy.storageFloor;
  const workers = bootstrap ? Math.max(0, policy.workers - view.upgraders) : 0;
  return { workers, haulers: needsSupply(view, policy.storageFloor) ? policy.haulers : 0 };
}
function needsSupply(view: UpgradeBootstrapView, floor: number): boolean {
  if (view.storageEnergy === undefined) return false;
  if (view.level >= 6 && (view.terminal || view.storageEnergy >= floor)) return false;
  // Preserve the strict legacy RCL5 cutoff, including the equality boundary.
  return view.level !== 5 || view.storageEnergy * 1.05 <= view.progressRemaining;
}
