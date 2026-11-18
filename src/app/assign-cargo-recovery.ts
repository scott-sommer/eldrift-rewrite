import type { StatePort } from '../persistence/versioned-state';
import type { TaskDefinition } from '../persistence/tasks/schema';
import { logisticsPool } from '../capabilities/logistics/request';
import { submitHaulingTask } from './submit-hauling-task';
export interface CargoRecovery {
  home: string; name: string; unitId: string; tick: number;
  resource: string; quantity: number; sink: string; sinkRoom?: string; sinkFree: number; sinkPool: string;
}
/** Recovery gets its own receipt identity; it never credits abandoned work. */
export function assignCargoRecovery(state: StatePort, definitions: Readonly<Record<string, TaskDefinition>>, cargo: CargoRecovery): boolean {
  const id = logisticsPool('cargo-recovery',cargo.unitId,cargo.resource,cargo.sink,String(cargo.tick));
  const request = { id,owner: logisticsPool('cargo-recovery',cargo.home),source: cargo.unitId,sink: cargo.sink,
    resource: cargo.resource,quantity: cargo.quantity,priority: -1,expiresAt: cargo.tick + 100 };
  return submitHaulingTask(state,definitions,{ home: cargo.home,name: cargo.name,unitId: cargo.unitId,tick: cargo.tick,
    request,phase: 'deliver',maximum: cargo.quantity,...(cargo.sinkRoom ? { sinkRoom: cargo.sinkRoom } : {}),
    available: { sourceStock: 0,sinkFree: cargo.sinkFree,sinkPool: cargo.sinkPool } });
}
