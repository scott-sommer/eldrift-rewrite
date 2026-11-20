import { canStandAt } from '../../src/adapters/screeps/service-position';
import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/app/native-logistics';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import type { LogisticsRequest } from '../../src/capabilities/logistics/request';
interface FixedHaulingMemory extends Memory { fixedHauling?: { tick: number; position: { x: number; y: number }; stores: number[]; pending: number; claims: number; tasks: number; walkable: boolean; terrain: number; look: string[] }[]; fixedCalls?: { kind: string; tick: number; x: number; y: number; code: number; target: string }[] }
const state = createMemoryPort(() => Memory);
export function loop() {
  const memory = Memory as FixedHaulingMemory, creep = Game.creeps.hauler!;
  creep.memory.population = { owner: haulingOwner('W0N1'),home: 'W0N1' };
  const config = openState(state,'operator/config',operatorSchema); config.empire = { logisticsEnabled: true }; saveState(state,'operator/config',operatorSchema,config);
  const containers = creep.room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === 'container');
  const source = containers.find(item => item.pos.x === 19)!, sink = containers.find(item => item.pos.x === 21)!;
  if (Game.time === 1) state.write('logistics-requests/W0N1',{ owner: 'logistics',version: 1,data: { records: [{ request: { id: 'legacy',owner: 'unrelated',source: 'legacy-source',sink: 'legacy-sink',resource: 'H',quantity: 5,priority: 100,expiresAt: 100 },cancelled: false,receipts: [{ id: 'prior',amount: 1 }] }] } });
  const request: LogisticsRequest = { id: 'fixed',owner: 'test-fixed',source: source.id,sink: sink.id,resource: 'energy',quantity: 30,priority: 0,expiresAt: 100,
    service: { collection: { room: 'W0N1',x: 18,y: 20 },deposit: { room: 'W0N1',x: 22,y: 20 },avoid: [{ room: 'W0N1',x: 19,y: 20 }] } };
  const queue = createLogisticsRequests(state,'W0N1'); queue.submit(request,Game.time);
  const withdraw = Creep.prototype.withdraw, transfer = Creep.prototype.transfer;
  Creep.prototype.withdraw = function(target,resource,amount) { const code = withdraw.call(this,target,resource,amount); record(this,'collect',target.id,code); return code; };
  Creep.prototype.transfer = function(target,resource,amount) { const code = transfer.call(this,target,resource,amount); record(this,'deliver',target.id,code); return code; };
  try { botLoop(); } finally { Creep.prototype.withdraw = withdraw; Creep.prototype.transfer = transfer; }
  const tasks = state.read('tasks/hauler') as { data: { queue: unknown[] } }, quantities = state.read('quantity-reservations/empire') as { data: { claims: unknown[] } };
  (memory.fixedHauling ??= []).push({ tick: Game.time,position: { x: creep.pos.x,y: creep.pos.y },walkable: canStandAt(creep.room,request.service!.collection),terrain: creep.room.getTerrain().get(18,20),look: creep.room.lookAt(18,20).map(item => item.type),stores: [source.store.energy,creep.store.energy,sink.store.energy],pending: queue.pending(Game.time).find(item => item.id === 'fixed')?.quantity ?? 0,claims: quantities.data.claims.length,tasks: tasks.data.queue.length });
}
function record(creep: Creep, kind: string, target: string, code: number): void {
  if (creep.name !== 'hauler') return;
  ((Memory as FixedHaulingMemory).fixedCalls ??= []).push({ kind,tick: Game.time,x: creep.pos.x,y: creep.pos.y,code,target });
}
