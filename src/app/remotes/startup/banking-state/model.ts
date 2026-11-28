import type { Outcome } from '../../../../core/execution/model';
import type { ForecastHaulingUnit } from '../hauling-state/transfer';
import type { ForecastHaulingTransferPorts } from '../hauling-state/transfer';
export interface ForecastRecoverySink { id: string; room: string; kind: string; owned: boolean; active: boolean }
/** Current modeled home/routes/visibility and sink policy; capacity and cargo come from the physical world. */
export interface ForecastBankingEnvironment extends Omit<ForecastHaulingTransferPorts<ForecastHaulingUnit>,'position'> {
  eventsVisible: NonNullable<ForecastHaulingTransferPorts<ForecastHaulingUnit>['eventsVisible']>;
  eligible(worker: ForecastHaulingUnit): boolean;
  homeReady(worker: ForecastHaulingUnit): boolean;
  routeReady(worker: ForecastHaulingUnit): boolean;
  retire(worker: ForecastHaulingUnit,home: string,owner: string): Outcome;
  acceptsEnergy(worker: ForecastHaulingUnit): boolean;
  acceptsSink(worker: ForecastHaulingUnit,sink: ForecastRecoverySink): boolean;
  destinations(worker: ForecastHaulingUnit): readonly ForecastRecoverySink[];
}
