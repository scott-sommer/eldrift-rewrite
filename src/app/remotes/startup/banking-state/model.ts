import type { Outcome } from '../../../../core/execution/model';
import type { ForecastMinerWorker } from '../mining-state/model';
import type { ForecastHaulingTransferPorts } from '../hauling-state/transfer';
export interface ForecastRecoverySink { id: string; room: string; kind: string; owned: boolean; active: boolean }
/** Current modeled home/routes/visibility and sink policy; capacity and cargo come from the physical world. */
export interface ForecastBankingEnvironment extends Omit<ForecastHaulingTransferPorts<ForecastMinerWorker>,'position'> {
  eventsVisible: NonNullable<ForecastHaulingTransferPorts<ForecastMinerWorker>['eventsVisible']>;
  eligible(worker: ForecastMinerWorker): boolean;
  homeReady(worker: ForecastMinerWorker): boolean;
  routeReady(worker: ForecastMinerWorker): boolean;
  retire(worker: ForecastMinerWorker,home: string,owner: string): Outcome;
  acceptsEnergy(worker: ForecastMinerWorker): boolean;
  acceptsSink(worker: ForecastMinerWorker,sink: ForecastRecoverySink): boolean;
  destinations(worker: ForecastMinerWorker): readonly ForecastRecoverySink[];
}
