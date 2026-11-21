import { specialistBoostLabIds, specialistLabRoleAllowed } from './native-specialist-labs';
import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { LabBoostRole } from '../config/lab-boost-roles';
import type { RuntimeConfig } from '../config/model';
import { boostLabRoles, reconcileBoostLabRoles } from '../features/industry/boost-labs/store';
import { boostLabServiceOwner, labTransferBusy } from '../features/industry/boost-labs/services';
import { reservedBoostLabs } from '../features/industry/boosts/store';
import { labServiceOwner } from '../features/industry/lab-services';
import { reconcileServiceRequest } from '../features/logistics/service-request';
import { planBoostSupply } from '../capabilities/industry/boosts/supply';
import { nativeBoostLab } from './native-boost-facts';
import { nativeLabWarehouses } from './native-lab-transport';
export function createNativeBoostLabRoles(state: StatePort): RoomFeature {
  return { id: 'boost-lab-roles',urgency: 'background',interval: 1,run({ room: view,config }) {
    const protectedLabs = specialistBoostLabIds(view.name,config.values);
    const desired = config.values.labBoostRoles.filter(role => specialistLabRoleAllowed(protectedLabs,role));
    if (!desired.length && state.read('industry-boost-labs/'+view.name) === undefined) return;
    const room = Game.rooms[view.name]; if (!room?.controller?.my) return;
    const pinned = new Set(reservedBoostLabs(state,room.name));
    for (const old of boostLabRoles(state,room.name)) {
      const next = desired.find(role => role.lab === old.lab);
      if (!next || next.resource !== old.resource) reconcileServiceRequest(state,room.name,Game.time,boostLabServiceOwner(room.name,old.lab),0,undefined);
    }
    const roles = reconcileBoostLabRoles(state,room.name,desired,lab => pinned.has(lab) || labTransferBusy(state,room.name,boostLabServiceOwner(room.name,lab),Game.time));
    for (const role of roles) supplyRole(state,room,role,config.values,pinned,protectedLabs);
  } };
}
function supplyRole(state: StatePort,room: Room,role: LabBoostRole,config: Readonly<RuntimeConfig>,pinned: ReadonlySet<string>,protectedLabs: readonly string[]): void {
  const owner = boostLabServiceOwner(room.name,role.lab), lab = Game.getObjectById(role.lab as Id<StructureLab>);
  const wanted = specialistLabRoleAllowed(protectedLabs,role) && config.labBoostRoles.find(next => next.lab === role.lab && next.resource === role.resource);
  reconcileServiceRequest(state,room.name,Game.time,labServiceOwner(room.name,role.lab),0,undefined);
  if (!wanted || pinned.has(role.lab) || !lab?.my || lab.room.name !== room.name || lab.structureType !== STRUCTURE_LAB || !lab.isActive()) {
    reconcileServiceRequest(state,room.name,Game.time,owner,0,undefined); return;
  }
  if (labTransferBusy(state,room.name,labServiceOwner(room.name,role.lab),Game.time)) return;
  if (!Object.values(BOOSTS).some(part => Object.hasOwn(part,role.resource))) throw new Error('Unsupported boost lab compound');
  const desired = planBoostSupply(nativeBoostLab(lab),nativeLabWarehouses(state,room,config),{ resource: role.resource,mineral: role.mineral,energy: role.energy,
    maximum: config.labTransportBatch,mineralReserve: config.labSupplyReserve,energyReserve: config.storageEnergyReserve });
  reconcileServiceRequest(state,room.name,Game.time,owner,config.labTransportPriority,desired);
}
