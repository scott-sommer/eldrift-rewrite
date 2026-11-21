import type { StatePort } from '../../src/persistence/versioned-state';
import { peekState } from '../../src/persistence/versioned-state';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { boostLabServiceOwner } from '../../src/features/industry/boost-labs/services';
import { industry } from '../../src/main';
declare global { interface Memory { specialistRoleChange?: { tick: number; cargo: number; receipts: number; correctedAt?: number } } }
export function roleSupplyReceipts(state: StatePort,home: string,lab: string): number {
  return (peekState(state,'logistics-requests/'+home,logisticsQueueSchema)?.records ?? []).filter(record => record.request.owner === boostLabServiceOwner(home,lab))
    .reduce((sum,record) => sum+record.receipts.reduce((sum,item) => sum+item.amount,0),0);
}
export function prepareSpecialistRole(state: StatePort,home: string,lab: string,courier: Creep): boolean {
  if (!Memory.specialistRoleChange && courier.store.getUsedCapacity(RESOURCE_ZYNTHIUM_OXIDE) > 0) Memory.specialistRoleChange = { tick: Game.time,cargo: courier.store.getUsedCapacity(RESOURCE_ZYNTHIUM_OXIDE),receipts: roleSupplyReceipts(state,home,lab) };
  const change = Memory.specialistRoleChange;
  if (change && Game.time === change.tick+30) {
    industry.labs.configure(home,{ labBoostRoles: [{ lab,resource: 'XGH2O',mineral: 60,energy: 40 }] }); change.correctedAt = Game.time;
  }
  return !!change;
}
