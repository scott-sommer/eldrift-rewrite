import { requireCheckpoint, record } from './validation';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectCheckpoint } from './project-model';
/** Only genuine old no-incumbent inputs may reuse format1 progress. */
export function upgradeStartupCheckpoint(input: StartupDeliveryInput, value: unknown): StartupProjectCheckpoint {
  requireCheckpoint(record(value)); const raw = value as Record<string,unknown>;
  if (raw.format !== 1) return value as StartupProjectCheckpoint;
  requireCheckpoint(input.initial === undefined && input.project.spawning.cash.openingAssets === undefined && !Object.hasOwn(raw,'opening'));
  return { ...raw,format: 2,opening: { pendingMinerEnergy: 0,minerStarted: false,minerOpeningEnergy: 0,constructionEnergyFromOpening: 0 } } as StartupProjectCheckpoint;
}
