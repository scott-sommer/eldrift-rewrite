import type { StatePort } from '../persistence/versioned-state';
import type { LabConfig } from '../config/labs';
import type { RuntimeConfig } from '../config/model';
type WarehouseConfig = Pick<RuntimeConfig,'storageFreeReserve' | 'terminalFreeReserve'>;
import type { LabAssignment } from '../capabilities/industry/labs/assignment';
import type { ReactionLab } from '../capabilities/industry/labs/model';
import type { LabWarehouse } from '../capabilities/industry/labs/transport';
import { planLabTransport } from '../capabilities/industry/labs/transport';
import { reconcileLabServices } from '../features/industry/lab-services';
import { createQuantityReservations } from '../persistence/quantities/store';
import { logisticsPool } from '../capabilities/logistics/request';
/** Use owned storage/terminal stock, respecting shared capacity and resource reservations. */
export function generateNativeLabTransport(state: StatePort,room: Room,assignment: LabAssignment | null,labs: readonly ReactionLab[],needed: number,config: Readonly<LabConfig & WarehouseConfig>): void {
  const stores = nativeLabWarehouses(state,room,config);
  const desired = assignment && config.labTransportEnabled ? planLabTransport(assignment,labs,stores,{ needed,inputReserve: config.labReagentReserve,
    supplyReserve: config.labSupplyReserve,maximum: config.labTransportBatch }) : [];
  reconcileLabServices(state,room.name,Game.time,desired,config.labTransportPriority);
}
export function nativeLabWarehouses(state: StatePort,room: Room,config: Readonly<WarehouseConfig>): readonly LabWarehouse[] {
  const claims = createQuantityReservations(state).list(Game.time).flatMap(claim => claim.allocations);
  const claimed = (pool: string) => claims.filter(item => item.pool === pool).reduce((sum,item) => sum+item.amount,0);
  return [room.storage,room.terminal].filter((store): store is StructureStorage | StructureTerminal => !!store?.my && store.isActive()).map(store => ({ id: store.id,
    free: Math.max(0,store.store.getFreeCapacity()-(store.structureType === STRUCTURE_STORAGE ? config.storageFreeReserve : config.terminalFreeReserve)-claimed(logisticsPool('capacity',store.id))),
    stock: Object.fromEntries(Object.keys(store.store).map(resource => [resource,Math.max(0,store.store.getUsedCapacity(resource as ResourceConstant)-claimed(logisticsPool('stock',store.id,resource)))])) }));
}
