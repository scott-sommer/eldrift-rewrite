import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createNativeDispatch } from '../../src/app/native-dispatch';
import { createNativeStartupEnergyAdmission } from '../../src/app/remotes/startup/energy-admission';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { logisticsPool } from '../../src/capabilities/logistics/request';
interface Probe { observedAt: number; calls: { tick: number; name: string; code: number; order: string[] }[]; pending: string[]; energy: number; names: string[]; recreated: boolean }
interface ProbeMemory extends Memory { spawnPreflight?: Probe }
const state = createMemoryPort(() => Memory);
function dispatch() { return createNativeDispatch(state,() => true,createNativeStartupEnergyAdmission(state)); }
const runtime = dispatch();
export function loop(): void {
  const memory = Memory as ProbeMemory, spawn = Game.spawns.Spawn1!;
  if (!memory.spawnPreflight) {
    openState(state,'operator/config',operatorSchema);
    memory.spawnPreflight = { observedAt: Game.time,calls: [],pending: [],energy: 0,names: [],recreated: false };
    state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'other-owner',owner: 'other',holder: 'worker',scope: 'home',expiresAt: 50,
      allocations: [{ pool: logisticsPool('stock',spawn.id,'energy'),amount: 100 }] }] } });
    const queue = createSpawnQueue(state,'W0N1');
    for (const [id,priority,body] of [['unsafe',0,['work','work','move']],['safe',1,['work','carry','move']]] as const) {
      queue.submit({ id,name: id,owner: 'fixture',room: 'W0N1',body: [...body],priority,readyAt: Game.time,expiresAt: 30,placement: { spawn: spawn.id,exit: { room: 'W0N1',x: spawn.pos.x-1,y: spawn.pos.y } } });
    }
  }
  const probe = memory.spawnPreflight, original = StructureSpawn.prototype.spawnCreep;
  StructureSpawn.prototype.spawnCreep = function(body,name,options) {
    const code = original.call(this,body,name,options); probe.calls.push({ tick: Game.time,name,code,order: options?.energyStructures?.map(point => point.id) ?? [] }); return code;
  };
  try { runtime.activate(); runtime.flush(); const recreated = dispatch(); recreated.activate(); recreated.flush(); probe.recreated = true; }
  finally { StructureSpawn.prototype.spawnCreep = original; }
  probe.pending = createSpawnQueue(state,'W0N1').list().map(request => request.id);
  probe.observedAt = Game.time; probe.energy = spawn.store.energy; probe.names = Object.keys(Game.creeps);
}
