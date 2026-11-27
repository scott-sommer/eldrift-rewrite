import type { createMovementService } from '../../adapters/screeps/movement-service';
import type { StatePort } from '../../persistence/versioned-state';
import type { RuntimeConfig } from '../../config/model';
/** Productive remote courier approaches only; banking and retirement retain their existing movement owner. */
export interface RemoteServiceMovement extends Pick<ReturnType<typeof createMovementService>,'move'> { before?(): void }
export type RemoteServiceMovementFactory = (state: StatePort,movement: ReturnType<typeof createMovementService>,configuration: (home: string) => Readonly<RuntimeConfig>) => RemoteServiceMovement;
