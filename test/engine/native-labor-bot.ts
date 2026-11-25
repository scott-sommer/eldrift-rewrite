import { runNativeLaborTask } from './native-labor-actor';
import { resumeLaborPlanning } from './native-labor-planning';
import { moveNativeLabor } from './native-labor-travel';
import { createStartupHousehold } from '../../src/capabilities/economy/startup/household/timeline';
import { spawnNativeLabor } from './native-labor-birth';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { laborInput, expectedLabor } from './native-labor-model';
import type { LaborMemory, NativeLaborProof, LaborSnapshot } from './native-labor-model';
export function loop(): void {
  const memory = Memory as LaborMemory, spawn = Game.spawns.Spawn1!, storage = spawn.room.storage!;
  openState(createMemoryPort(() => Memory),'operator/config',operatorSchema);
  const proof = memory.nativeLabor ??= { kind: memory.nativeLaborKind!,loaded: !!memory.nativeLaborLoaded,...(memory.nativeLaborFault ? { fault: memory.nativeLaborFault } : {}),cancel: !!memory.nativeLaborCancel,complete: !!memory.nativeLaborComplete,travel: !!memory.nativeLaborTravel,targetTotal: targetTotal(memory.nativeLaborKind!),initialSpawn: spawn.store.energy,initialEndpoint: storage.store.energy,initialProgress: progress(memory.nativeLaborKind!),rows: [],calls: [] };
  const creep = Game.creeps[proof.proposal?.input.request.name ?? 'native-labor'], actual = observe(proof,spawn,storage,creep);
  proof.rows.push({ tick: Game.time,actual,...(creep ? { position: { x: creep.pos.x,y: creep.pos.y,fatigue: creep.fatigue } } : {}),...(proof.expected ? { expected: proof.expected } : {}) });
  if (creep && !creep.spawning && proof.activeAt === undefined) proof.activeAt = Game.time;
  resumeLaborPlanning(proof);
  const tick = Game.time-1;
  if (tick > 24) return;
  const input = laborInput(proof,spawn), model = createStartupHousehold(input,proof.checkpoint), before = proof.checkpoint?.labor?.jobs[0];
  for (const birth of model.begin(tick)) {
    const code = spawnNativeLabor(proof,input.spawning.requests[0]!,birth,spawn);
    record(proof,'birth',code,birth.cost);
  }
  model.finish(); const saved = model.checkpoint(), after = saved.labor!.jobs[0]!;
  const picked = after.picked-(before?.picked ?? 0), spent = after.spent-(before?.spent ?? 0), returned = after.returned-(before?.returned ?? 0);
  if (proof.complete) runNativeLaborTask(proof,creep);
  else {
  if (picked) record(proof,'pickup',creep!.withdraw(storage,RESOURCE_ENERGY,picked),picked);
  if (spent) record(proof,proof.kind,work(proof,creep!),spent);
  if (returned) record(proof,'return',creep!.transfer(storage,RESOURCE_ENERGY,returned),returned);
  moveNativeLabor(proof,creep,tick,after,picked+spent+returned > 0);
  }
  proof.checkpoint = saved; proof.expected = expectedLabor(proof,saved);
  if (tick === 24) proof.result = model.result();
}
function record(proof: NativeLaborProof, action: string, code: number, energy: number): void {
  proof.calls.push({ tick: Game.time,action,code,energy }); if (code !== OK) throw new Error('Native labor '+action+' refused: '+code);
}
function work(proof: NativeLaborProof, creep: Creep): number {
  if (proof.kind === 'upgrade') return creep.upgradeController(creep.room.controller!);
  if (proof.kind === 'build') return creep.build(creep.room.find(FIND_MY_CONSTRUCTION_SITES)[0]!);
  return creep.repair(creep.room.find(FIND_STRUCTURES).find(point => point.structureType === STRUCTURE_ROAD)!);
}
function progress(kind: NativeLaborProof['kind'], total = 0): number {
  const room = Game.spawns.Spawn1!.room;
  if (kind === 'upgrade') return room.controller!.progress;
  if (kind === 'build') return buildProgress(room,total);
  return room.find(FIND_STRUCTURES).find(point => point.structureType === STRUCTURE_ROAD)!.hits;
}
function observe(proof: NativeLaborProof, spawn: StructureSpawn, storage: StructureStorage, creep: Creep | undefined): LaborSnapshot {
  const cargo = creep?.store.energy ?? 0;
  return { spawn: spawn.store.energy,endpoint: storage.store.energy,cargo,bank: spawn.store.energy+storage.store.energy+cargo,progress: progress(proof.kind,proof.targetTotal)-proof.initialProgress };
}

function targetTotal(kind: NativeLaborProof['kind']): number {
  const room = Game.spawns.Spawn1!.room;
  if (kind === 'build') return room.find(FIND_MY_CONSTRUCTION_SITES)[0]!.progressTotal;
  if (kind === 'repair') return room.find(FIND_STRUCTURES).find(point => point.structureType === STRUCTURE_ROAD)!.hitsMax;
  return room.controller!.progressTotal;
}
function buildProgress(room: Room, total: number): number {
  const site = room.find(FIND_MY_CONSTRUCTION_SITES)[0]; if (site) return site.progress;
  if (room.find(FIND_STRUCTURES).some(point => point.structureType === STRUCTURE_ROAD && point.pos.x === 14 && point.pos.y === 16)) return total;
  throw new Error('Native construction target vanished without a completed road');
}
