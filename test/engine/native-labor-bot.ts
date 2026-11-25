import { createStartupHousehold } from '../../src/capabilities/economy/startup/household/timeline';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { laborInput, expectedLabor } from './native-labor-model';
import type { LaborMemory, NativeLaborProof, LaborSnapshot } from './native-labor-model';
export function loop(): void {
  const memory = Memory as LaborMemory, spawn = Game.spawns.Spawn1!, storage = spawn.room.storage!;
  openState(createMemoryPort(() => Memory),'operator/config',operatorSchema);
  const proof = memory.nativeLabor ??= { kind: memory.nativeLaborKind!,initialSpawn: spawn.store.energy,initialEndpoint: storage.store.energy,initialProgress: progress(memory.nativeLaborKind!),rows: [],calls: [] };
  const creep = Game.creeps['native-labor'], actual = observe(proof,spawn,storage,creep);
  proof.rows.push({ tick: Game.time,actual,...(proof.expected ? { expected: proof.expected } : {}) });
  if (creep && !creep.spawning && proof.activeAt === undefined) proof.activeAt = Game.time;
  const tick = Game.time-1;
  if (tick > 24) return;
  const input = laborInput(proof,spawn), model = createStartupHousehold(input,proof.checkpoint), before = proof.checkpoint?.labor?.jobs[0];
  for (const birth of model.begin(tick)) {
    const code = createNativeSpawn(() => ({}),() => [spawn])({ request: input.spawning.requests[0]!,spawn: spawn.id,cost: birth.cost });
    record(proof,'birth',code,birth.cost);
  }
  model.finish(); const saved = model.checkpoint(), after = saved.labor!.jobs[0]!;
  const picked = after.picked-(before?.picked ?? 0), spent = after.spent-(before?.spent ?? 0), returned = after.returned-(before?.returned ?? 0);
  if (picked) record(proof,'pickup',creep!.withdraw(storage,RESOURCE_ENERGY,picked),picked);
  if (spent) record(proof,proof.kind,work(proof,creep!),spent);
  if (returned) record(proof,'return',creep!.transfer(storage,RESOURCE_ENERGY,returned),returned);
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
function progress(kind: NativeLaborProof['kind']): number {
  const room = Game.spawns.Spawn1!.room;
  if (kind === 'upgrade') return room.controller!.progress;
  if (kind === 'build') return room.find(FIND_MY_CONSTRUCTION_SITES)[0]!.progress;
  return room.find(FIND_STRUCTURES).find(point => point.structureType === STRUCTURE_ROAD)!.hits;
}
function observe(proof: NativeLaborProof, spawn: StructureSpawn, storage: StructureStorage, creep: Creep | undefined): LaborSnapshot {
  const cargo = creep?.store.energy ?? 0;
  return { spawn: spawn.store.energy,endpoint: storage.store.energy,cargo,bank: spawn.store.energy+storage.store.energy+cargo,progress: progress(proof.kind)-proof.initialProgress };
}
