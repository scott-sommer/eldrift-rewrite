import type { StartupDeliveryInput } from '../../src/capabilities/economy/startup/delivery-model';
import type { StartupProjectCheckpoint } from '../../src/capabilities/economy/startup/checkpoints/project-model';
/** Builds a genuine old no-incumbent fixture; never downgrades actual opening assets. */
export function legacyStartupCheckpoint(input: StartupDeliveryInput, checkpoint: StartupProjectCheckpoint): unknown {
  if (input.initial !== undefined || input.project.spawning.cash.openingAssets !== undefined) throw new Error('Legacy fixture cannot contain opening assets');
  const value = JSON.parse(JSON.stringify(checkpoint)) as Record<string,unknown>;
  const opening = value.opening as Record<string,unknown>;
  if (Object.values(opening).some(value => value !== 0 && value !== false)) throw new Error('Legacy fixture has active inventory');
  delete value.opening; value.format = 1;
  const timeline = value.timeline as { accounting: Record<string,unknown> };
  delete timeline.accounting.openingConstructionEnergy;
  delete (value.houseAccounting as Record<string,unknown>).openingConstructionEnergy;
  delete (value.sourceAccounting as Record<string,unknown>).openingConstructionEnergy;
  return value;
}
