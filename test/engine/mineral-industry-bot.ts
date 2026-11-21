import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState, peekState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { haulingOwner } from '../../src/features/logistics/identity';
interface Row { minersBefore: number; tick: number; mineral: number; containerH: number; bankH: number; bankOH: number; labH: number; labOH: number; cargoH: number; cargoOH: number; courierH: number; mineralReceipts: number; labHReceipts: number; miners: { name: string; spawning: boolean }[] }
declare global { interface Memory { mineralIndustryRows?: Row[] } }
const state = createMemoryPort(() => Memory);
export function loop() {
  const room = Game.rooms.W0N1!, courier = Game.creeps['lab-courier']!;
  courier.memory.population = { owner: haulingOwner(room.name),home: room.name };
  const settings = openState(state,'operator/config',operatorSchema);
  settings.empire = { miningEnabled: true,mineralMiningEnabled: true,miningBodyBudget: 200,logisticsEnabled: true,mineralTransportEnabled: true,
    labReactionsEnabled: true,labReactionProduct: 'OH',labReactionTarget: 15,labTransportBatch: 20 };
  saveState(state,'operator/config',operatorSchema,settings);
  const minersBefore = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner.startsWith('mining:')).length;
  botLoop();
  const mineral = room.find(FIND_MINERALS)[0]!, container = room.find(FIND_STRUCTURES).find((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER)!;
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB), creeps = Object.values(Game.creeps);
  const labStock = (resource: ResourceConstant) => labs.reduce((sum,lab) => sum+(lab.store.getUsedCapacity(resource) ?? 0),0);
  const cargo = (resource: ResourceConstant) => creeps.reduce((sum,creep) => sum+(creep.store.getUsedCapacity(resource) ?? 0),0);
  const requests = peekState(state,'logistics-requests/'+room.name,logisticsQueueSchema)?.records ?? [];
  const receipts = (owner: string) => requests.filter(record => record.request.owner.startsWith(owner) && record.request.resource === 'H').reduce((sum,record) => sum+record.receipts.reduce((sum,item) => sum+item.amount,0),0);
  (Memory.mineralIndustryRows ??= []).push({ minersBefore,tick: Game.time,mineral: mineral.mineralAmount,containerH: container.store.getUsedCapacity('H'),bankH: room.storage!.store.getUsedCapacity('H'),bankOH: room.storage!.store.getUsedCapacity('OH'),labH: labStock('H'),labOH: labStock('OH'),cargoH: cargo('H'),cargoOH: cargo('OH'),courierH: courier.store.getUsedCapacity('H'),
    mineralReceipts: receipts(haulingOwner(room.name)+':mineral'),labHReceipts: receipts('industry-labs:'),miners: creeps.filter(creep => creep.memory.population?.owner.startsWith('mining:')).map(creep => ({ name: creep.name,spawning: creep.spawning })) });
}
