import { validateSharedCommitments } from '../shared-validation';
import { startupProjectFormat } from './project-format';
import { createStartupSpawnTimeline } from '../spawn-timeline';
import { createStartupHousehold } from '../household/timeline';
import { validateHouseholdProject } from '../project-timeline';
import { upgradeStartupCheckpoint } from './upgrade';
import { restoreOpeningStock } from '../opening-stock';
import { StartupCheckpointCapacityError } from './capacity';
import { copyPlain } from '../../../../core/plain-data';
import { startupProjectIdentity } from './project-identity';
import { restoreCashCheckpoint } from './cash';
import { restoreContainerCheckpoint } from './container';
import { restoreSinkCheckpoint } from './sink';
import { validateProjectConstruction } from './project-work';
import { validateProjectDelivery } from './project-delivery';
import { validateProjectCouriers } from './project-workers';
import { validateProjectLinks } from './project-links';
import { integer, keys, record, requireCheckpoint } from './validation';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectCheckpoint } from './project-model';
export function readStartupProjectCheckpoint(input: StartupDeliveryInput, value: unknown): StartupProjectCheckpoint {
  const saved = upgradeStartupCheckpoint(input,boundedProjectCheckpoint(value));
  requireCheckpoint(record(saved));
  requireCheckpoint(keys(saved as unknown as Record<string,unknown>,['format','binding','tick','timeline','container','sink','construction','delivery','couriers','due','settled','houseAccounting','sourceAccounting','opening',...(input.household ? ['household'] : [])]));
  requireCheckpoint(saved.format === startupProjectFormat(input) && saved.binding === startupProjectIdentity(input));
  requireCheckpoint(integer(saved.tick,0,input.project.spawning.cash.horizon+1));
  validateComponents(input,saved);
  validateProjectConstruction(input,saved.construction,saved.tick);
  restoreOpeningStock(input,saved.opening);
  validateProjectCouriers(input,saved.timeline.births,saved.couriers,saved.tick);
  validateProjectDelivery(input,saved); validateProjectLinks(input,saved);
  return saved;
}
export function boundedProjectCheckpoint<T>(value: T): T {
  const saved = copyPlain(value);
  if (JSON.stringify(saved).length > 1048576) throw new StartupCheckpointCapacityError('Startup checkpoint capacity');
  return saved;
}
function validateComponents(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const spawning = input.project.spawning, ambient = !!spawning.funding.energyLayout?.regeneration;
  validateSharedCommitments(input);
  validateHouseholdProject(input);
  if (input.household) createStartupHousehold({ ...input.household,spawning },{ ...saved.household!,spawning: saved.timeline });
  else createStartupSpawnTimeline(spawning,saved.timeline);
  saved.timeline.accounting = restoreCashCheckpoint(spawning.cash,saved.timeline.accounting,ambient);
  saved.houseAccounting = restoreCashCheckpoint(spawning.cash,saved.houseAccounting,ambient);
  saved.sourceAccounting = restoreCashCheckpoint(spawning.cash,saved.sourceAccounting,ambient);
  restoreContainerCheckpoint(input.container,saved.container);
  restoreSinkCheckpoint(input.homeSink.capacity,spawning.cash.horizon,saved.sink);
}
