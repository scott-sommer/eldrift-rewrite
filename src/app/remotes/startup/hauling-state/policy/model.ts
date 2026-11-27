import type { EnergyInventoryFrame } from '../../../../../capabilities/resources/energy-inventory/frame';
import type { PlannedMovementCommand } from '../../../../../capabilities/movement/fixed-step';
import type { Outcome } from '../../../../../core/execution/model';
import type { RemoteTransportDemand } from '../../../../../features/remotes/transport-authority';
import type { StartupTravelPlan } from '../../../../../features/remotes/startup/travel-model';
import type { StartupPaidWorker } from '../../../../../capabilities/economy/startup/shared-model';
import type { PaidHaulingForecastWorker,PaidHaulingServicePorts } from '../service';
import type { ForecastCourierPhysical } from '../observation';
export interface PaidTransportSource { demand: RemoteTransportDemand; plan: StartupTravelPlan; couriers: readonly { paid: StartupPaidWorker }[] }
export interface PaidTransportBinding { source: PaidTransportSource; paid: StartupPaidWorker }
export interface PaidTransportPolicyPorts {
  inventory: EnergyInventoryFrame;
  physical(worker: PaidHaulingForecastWorker): ForecastCourierPhysical;
  /** A current qualified token or an explicit modelled renewal; never inferred from the opening token. */
  authority(worker: PaidHaulingForecastWorker,tick: number): RemoteTransportDemand | undefined;
  collection(worker: PaidHaulingForecastWorker): string | undefined;
  visible(room: string): boolean;
  roomPolicy(worker: PaidHaulingForecastWorker,phase: 'collect' | 'deliver'): PlannedMovementCommand['policy'];
  move(name: string,command: PlannedMovementCommand): Outcome;
  view: PaidHaulingServicePorts['view'];
}
