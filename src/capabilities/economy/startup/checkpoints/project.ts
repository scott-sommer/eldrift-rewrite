import { copyPlain } from '../../../../core/plain-data';
import { startupProjectIdentity } from './project-identity';
import { restoreTimelineCheckpoint } from './timeline';
import { restoreCashCheckpoint } from './cash';
import { restoreContainerCheckpoint } from './container';
import { restoreSinkCheckpoint } from './sink';
import { restoreFundingCheckpoint } from './funding';
import { validateProjectConstruction } from './project-work';
import { validateProjectDelivery } from './project-delivery';
import { validateProjectCouriers } from './project-workers';
import { validateProjectLinks } from './project-links';
import { integer, keys, record, requireCheckpoint } from './validation';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectCheckpoint } from './project-model';
export function readStartupProjectCheckpoint(input: StartupDeliveryInput, value: unknown): StartupProjectCheckpoint {
  const saved = boundedProjectCheckpoint(value) as StartupProjectCheckpoint;
  requireCheckpoint(record(saved));
  requireCheckpoint(keys(saved as unknown as Record<string,unknown>,['format','binding','tick','timeline','container','sink','construction','delivery','couriers','due','settled','houseAccounting','sourceAccounting']));
  requireCheckpoint(saved.format === 1 && saved.binding === startupProjectIdentity(input));
  requireCheckpoint(integer(saved.tick,0,input.project.spawning.cash.horizon+1));
  validateComponents(input,saved);
  validateProjectConstruction(input.project,saved.construction,saved.tick);
  validateProjectCouriers(input,saved.timeline.births,saved.couriers,saved.tick);
  validateProjectDelivery(input,saved); validateProjectLinks(input,saved);
  return saved;
}
export function boundedProjectCheckpoint<T>(value: T): T {
  const saved = copyPlain(value);
  if (JSON.stringify(saved).length > 1048576) throw new Error('Startup checkpoint capacity');
  return saved;
}
function validateComponents(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const spawning = input.project.spawning;
  restoreTimelineCheckpoint(spawning,saved.timeline);
  restoreFundingCheckpoint(spawning.funding.capacity,saved.timeline.funding);
  restoreCashCheckpoint(spawning.cash,saved.timeline.accounting);
  restoreCashCheckpoint(spawning.cash,saved.houseAccounting);
  restoreCashCheckpoint(spawning.cash,saved.sourceAccounting);
  restoreContainerCheckpoint(input.container,saved.container);
  restoreSinkCheckpoint(input.homeSink.capacity,spawning.cash.horizon,saved.sink);
}
