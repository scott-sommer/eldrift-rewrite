import type { HomeMiningEnvironment } from '../../mining-state/environment';
import type { EnergyPostprocessOrder } from '../../../../../capabilities/resources/energy-inventory/model';
import type { PaidHomeControl } from '../../home-observation/model';
import type { StatePort } from '../../../../../persistence/versioned-state';
import type { createActionArbiter } from '../../../../../core/execution/action-arbiter';
import type { createQuantityReservations } from '../../../../../persistence/quantities/store';
import type { EnergyInventoryFrame } from '../../../../../capabilities/resources/energy-inventory/frame';
import type { EnergyEcology } from '../../../../../capabilities/resources/energy-inventory/model';
import type { EnergyIntent } from '../../../../../capabilities/resources/energy-inventory/model';
import type { PlannedMovementCommand } from '../../../../../capabilities/movement/fixed-step';
import type { TransitFramePorts } from '../../../../../capabilities/movement/transit/frame';
import type { RemoteTransportDemand } from '../../../../../features/remotes/transport-authority';
import type { Position } from '../../../../../capabilities/movement/step';
import type { PaidHomeSourceObservation } from '../../home-observation/model';
import type { QuantityClaimPartition } from '../../../../../persistence/quantities/partition';
import type { PaidHomePhysicalInput } from '../inventory';
import type { PaidHaulingForecastWorker } from '../service';
import type { ForecastCourierPhysical } from '../observation';
import type { PaidMovementExternalFrame } from '../movement/model';
export interface HomeHaulingInput extends PaidHomePhysicalInput {
  home: string;
  ecology?: EnergyEcology;
  control?: PaidHomeControl;
  sources: readonly Pick<PaidHomeSourceObservation,'plan' | 'demand' | 'miners' | 'couriers'>[];
  claims: Pick<QuantityClaimPartition,'owned' | 'external'>;
}
export interface HomeWorldShared {
  state: StatePort;
  inventory: Pick<EnergyInventoryFrame,'tick' | 'observe' | 'queue' | 'pending' | 'effect' | 'source' | 'structure' | 'site'>;
  quantities: ReturnType<typeof createQuantityReservations>;
  arbiter: ReturnType<typeof createActionArbiter>;
  body(unit: string): ForecastCourierPhysical;
}
export interface HomeWorldEnvironment extends TransitFramePorts {
  mining?: HomeMiningEnvironment;
  authority(worker: PaidHaulingForecastWorker,tick: number): RemoteTransportDemand | undefined;
  visible(room: string,tick: number): boolean;
  endpoint(worker: PaidHaulingForecastWorker,phase: 'collect' | 'deliver',tick: number): { id: string; position: Position; active: boolean } | undefined;
  roomPolicy(worker: PaidHaulingForecastWorker,phase: 'collect' | 'deliver',tick: number): PlannedMovementCommand['policy'];
}
export type HomeWorldOperation = { kind: 'settle' } | { kind: 'paid'; name: string; work: boolean }
  | { kind: 'miner'; name: string }
  | { kind: 'external'; id: string; run(shared: HomeWorldShared): void };
export interface HomeHaulingFrame {
  tick: number; operations: readonly HomeWorldOperation[]; outside: PaidMovementExternalFrame;
  postprocessOrder?: EnergyPostprocessOrder;
  settlementOrder(intents: readonly EnergyIntent[]): readonly string[];
}
export interface HomeConfirmedDelivery { source: string; request: string; id: string; energy: number; issuedAt: number; tick: number }
