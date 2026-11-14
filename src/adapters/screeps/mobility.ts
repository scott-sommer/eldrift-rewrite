import { mobilityCosts } from '../../capabilities/movement/mobility';
import type { MobilityPart } from '../../capabilities/movement/mobility';
function movePower(boost?: keyof (typeof BOOSTS)[typeof MOVE]): number {
  return boost ? BOOSTS[MOVE][boost]?.fatigue ?? 1 : 1;
}
function carryCapacity(boost?: keyof (typeof BOOSTS)[typeof CARRY]): number {
  return CARRY_CAPACITY * (boost ? BOOSTS[CARRY][boost]?.capacity ?? 1 : 1);
}
function partMobility(part: BodyPartDefinition): MobilityPart {
  const active = part.hits > 0;
  if (part.type === MOVE) return { kind: 'move', active, movePower: movePower(part.boost), carryCapacity: 0 };
  if (part.type === CARRY) return { kind: 'carry', active, movePower: 0, carryCapacity: carryCapacity(part.boost) };
  return { kind: 'other', active, movePower: 0, carryCapacity: 0 };
}
export function creepMobility(creep: Creep) {
  return mobilityCosts(creep.body.map(partMobility), creep.store.getUsedCapacity());
}
