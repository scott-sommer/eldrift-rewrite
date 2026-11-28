import type { TaskBehavior } from '../../../task-runner';
import type { RemoteMiningCyclePorts } from '../../mining-cycle';
import type { ForecastMinerWorker,ForecastMiningPorts } from './model';
/** Current modeled owners supply environment decisions; physical WORK effects belong to this composition. */
export interface HomeMiningEnvironment extends Pick<ForecastMiningPorts,'allowed' | 'station' | 'infrastructure' | 'move' | 'retire'> {
  eligible: RemoteMiningCyclePorts<ForecastMinerWorker>['eligible'];
  mode: RemoteMiningCyclePorts<ForecastMinerWorker>['mode'];
  banking: Readonly<Partial<Record<'haul',TaskBehavior<ForecastMinerWorker>>>>;
  buildAllowed(worker: ForecastMinerWorker,site: string): boolean;
}
