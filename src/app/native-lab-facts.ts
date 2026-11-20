import type { StatePort } from '../persistence/versioned-state';
import { createQuantityReservations } from '../persistence/quantities/store';
import { logisticsPool } from '../capabilities/logistics/request';
import type { ReactionLab } from '../capabilities/industry/labs/model';
export function nativeReactionLabs(state: StatePort,room: Room,excluded: readonly string[]): { physical: ReactionLab[]; available: ReactionLab[] } {
  const claims = new Map<string,number>();
  for (const allocation of createQuantityReservations(state).list(Game.time).flatMap(claim => claim.allocations)) claims.set(allocation.pool,(claims.get(allocation.pool) ?? 0)+allocation.amount);
  const physical = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB)
    .filter(lab => lab.isActive() && !excluded.includes(lab.id)).map(lab => ({ id: lab.id,x: lab.pos.x,y: lab.pos.y,mineral: lab.mineralType ?? null,
      amount: lab.mineralType ? lab.store.getUsedCapacity(lab.mineralType) : 0,free: lab.mineralType ? lab.store.getFreeCapacity(lab.mineralType) : LAB_MINERAL_CAPACITY,
      cooldown: lab.cooldown,reactionAmount: reactionAmount(lab) }));
  const available = physical.map(lab => ({ ...lab,amount: Math.max(0,lab.amount-(claims.get(logisticsPool('stock',lab.id,lab.mineral ?? '')) ?? 0)),
    free: Math.max(0,lab.free-(claims.get(logisticsPool('capacity',lab.id,'mineral')) ?? 0)) }));
  return { physical,available };
}
function reactionAmount(lab: StructureLab): number {
  const effect = lab.effects?.find(effect => effect.effect === PWR_OPERATE_LAB && effect.ticksRemaining > 0);
  return LAB_REACTION_AMOUNT+(effect && 'level' in effect ? POWER_INFO[PWR_OPERATE_LAB].effect[effect.level-1]! : 0);
}
export function nativeProductStock(room: Room,product: string): number {
  const resource = product as ResourceConstant;
  const structures = room.find(FIND_MY_STRUCTURES).filter(item => 'store' in item);
  return structures.reduce((sum,item) => sum+('store' in item ? item.store.getUsedCapacity(resource) ?? 0 : 0),0)
    +room.find(FIND_MY_CREEPS).reduce((sum,creep) => sum+creep.store.getUsedCapacity(resource),0);
}
