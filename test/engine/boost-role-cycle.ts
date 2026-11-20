import { industry, loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
import { workOwner } from '../../src/features/work/identity';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
export type BoostRoleMode = 'normal' | 'switch' | 'remove';
interface Row { tick: number; desired: string | null; bound: string | null; mineral: string | null; amount: number; energy: number; cargo: number; cargoX: number; bankX: number; bankK: number; bankZO: number; bankOH: number; work: number; ready: boolean; reactionLabs: string[] }
declare global { interface Memory { boostRoleRows?: Row[]; boostRoleChanged?: boolean; boostRoleRequested?: boolean } }
const state = createMemoryPort(() => Memory), owner = workOwner('W0N1','upgrader');
export function runBoostRole(mode: BoostRoleMode): void {
  const room = Game.rooms.W0N1!, creep = Game.creeps['boost-target']!, courier = Game.creeps['boost-courier']!;
  creep.memory.population = { owner,home: room.name }; courier.memory.population = { owner: haulingOwner(room.name),home: room.name };
  const lab = room.find(FIND_MY_STRUCTURES).find((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.pos.x === 17 && item.pos.y === 20)!;
  const settings = openState(state,'operator/config',operatorSchema);
  settings.empire = { logisticsEnabled: true,workersEnabled: Memory.boostRoleRequested ?? false,workerMode: 'upgrader',workerUpgradeReserve: 0,
    labReactionsEnabled: true,labReactionProduct: 'OH',labReactionTarget: 10,labTransportBatch: 20 };
  saveState(state,'operator/config',operatorSchema,settings);
  if (!Memory.boostRoleRows) industry.labs.configure(room.name,{ labBoostRoles: [{ lab: lab.id,resource: 'XGH2O',mineral: 60,energy: 40 }] });
  if (mode !== 'normal' && !Memory.boostRoleChanged && courier.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID) > 0) {
    industry.labs.configure(room.name,{ labBoostRoles: mode === 'remove' ? [] : [{ lab: lab.id,resource: 'ZO',mineral: 30,energy: 20 }] }); Memory.boostRoleChanged = true;
  }
  if (mode === 'normal' && !Memory.boostRoleRequested && lab.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID) >= 60 && lab.store.getUsedCapacity(RESOURCE_ENERGY) >= 40) {
    const result = industry.boosts.request(creep.name,[{ part: WORK,resource: RESOURCE_CATALYZED_GHODIUM_ACID,count: 2 }],{ id: 'role-boost',expiresAt: Game.time+100,required: true,preferredLab: lab.id });
    if (!result.accepted) throw new Error('Expected stocked role admission'); Memory.boostRoleRequested = true;
  }
  botLoop();
  const inspect = industry.labs.inspect(room.name), job = createBoostRequests(state).get(owner,'role-boost');
  (Memory.boostRoleRows ??= []).push({ tick: Game.time,desired: inspect.values.labBoostRoles?.[0]?.resource ?? null,bound: inspect.boostRoles[0]?.resource ?? null,
    mineral: lab.mineralType ?? null,amount: lab.mineralAmount ?? 0,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY),cargo: courier.store.getUsedCapacity(),cargoX: courier.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID),
    bankX: room.storage!.store.getUsedCapacity(RESOURCE_CATALYZED_GHODIUM_ACID),bankK: room.storage!.store.getUsedCapacity(RESOURCE_KEANIUM),bankZO: room.storage!.store.getUsedCapacity(RESOURCE_ZYNTHIUM_OXIDE),bankOH: room.storage!.store.getUsedCapacity(RESOURCE_HYDROXIDE),
    work: creep.body.filter(part => part.type === WORK && part.boost === RESOURCE_CATALYZED_GHODIUM_ACID).length,ready: job?.status === 'confirmed',reactionLabs: inspect.assignment ? [...inspect.assignment.inputs,...inspect.assignment.outputs] : [] });
}
