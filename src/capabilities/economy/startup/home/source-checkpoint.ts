import { keys,record,requireCheckpoint } from '../checkpoints/validation';
import { validateProjectConstruction } from '../checkpoints/project-work';
import { validateProjectDelivery } from '../checkpoints/project-delivery';
import { validateProjectCouriers } from '../checkpoints/project-workers';
import { validateProjectSourceLinks } from '../checkpoints/source-links';
import { restoreContainerCheckpoint } from '../checkpoints/container';
import { restoreOpeningStock } from '../opening-stock';
import { createStartupProjectMotion } from '../courier-trips/project';
import type { prepareStartupHomeProject } from './input';
import type { StartupHomeSourceCheckpoint } from './checkpoint-model';
import type { StartupScheduledBirth } from '../spawn-model';
export function readHomeSourceCheckpoint(source: ReturnType<typeof prepareStartupHomeProject>['sources'][number],value: unknown,tick: number,births: StartupScheduledBirth[]): StartupHomeSourceCheckpoint {
  requireCheckpoint(record(value) && keys(value,['id','container','construction','delivery','opening','couriers','trips','due','settled']));
  const saved = value as StartupHomeSourceCheckpoint,input = source.input;
  requireCheckpoint(saved.id === source.id);
  validateProjectConstruction(input,saved.construction,tick);
  restoreContainerCheckpoint(input.container,saved.container); restoreOpeningStock(input,saved.opening);
  validateProjectCouriers(input,births,saved.couriers,tick);
  validateProjectDelivery(input,{ ...saved,tick });
  validateProjectSourceLinks(input,{ ...saved,tick,timeline: { births } });
  const workers = saved.couriers.map(worker => ({ ...worker,nextAt: worker.nextAt ?? Infinity }));
  createStartupProjectMotion(input,{ trips: saved.trips },workers,births,tick);
  requireCheckpoint([...saved.settled,...saved.due].every(receipt => record(receipt) && keys(receipt,['request','tick','energy','id']) && receipt.id === 'remote-delivery:'+receipt.request+':'+receipt.tick));
  return saved;
}
