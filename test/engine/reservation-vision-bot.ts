import { reservationIdentity } from '../../src/features/remotes/reservation/identity';
import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { resolveConfig } from '../../src/config/resolve';
import { nativeRemoteManagementPolicy } from '../../src/app/remotes/management/policy';
import { createNativeReservationCandidates } from '../../src/app/remotes/reservation/candidates';
import { createNativeRemoteManagement } from '../../src/app/remotes/management/native';
import { createIntelStore } from '../../src/features/intel/store';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { snapshotPipeline } from './remote-pipeline-probe';
import type { PipelineMemory } from './remote-pipeline-probe';
import { reservationScenarioConfig } from './reservation-scenario-config';
const state = createMemoryPort(() => Memory), home = 'W0N1', remote = 'E0N1';
const candidates = createNativeReservationCandidates(state), manager = createNativeRemoteManagement(state,{ maximumRooms: 8,maximumOps: 10000 });
export function loop(): void {
  const memory = Memory as PipelineMemory;
  if (Game.time === 1) setup();
  controls(memory); moveSensor();
  const raw = openState(state,'operator/config',operatorSchema), config = resolveConfig({ empire: raw.empire },Game.time).values;
  const policy = candidates(Game.rooms[home]!,nativeRemoteManagementPolicy(Game.rooms[home]!,[remote],config)!,config,() => true);
  const result = manager.advance({ home,tick: Game.time,policy },{ rooms: 1,sources: 1 },() => true);
  const calls: { unit: string; code: number }[] = [], reserve = Creep.prototype.reserveController;
  Creep.prototype.reserveController = function(controller) { const code = reserve.call(this,controller); calls.push({ unit: this.name,code }); return code; };
  try { runtimeLoop(); } finally { Creep.prototype.reserveController = reserve; }
  const intel = createIntelStore(state).peek(remote,Game.time).record.summary;
  const actor = Object.values(Game.creeps).find(creep => reservationIdentity(creep.memory.population?.owner ?? ''));
  snapshotPipeline(state,memory,{ stage: stage(),status: result.status,calls,binding: actor ? { name: actor.name,generation: reservationIdentity(actor.memory.population!.owner)!.generation } : null,sensorRoom: Game.creeps['reservation-witness']!.pos.roomName,
    retained: intel ? { observedAt: intel.observedAt,sources: intel.sources.map(source => source.id),reservation: intel.controller?.reservation ?? null,foreignUnits: intel.units.filter(unit => !unit.owned).length } : null });
}
function setup(): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...reservationScenarioConfig(),intelMaximumAge: 20,remoteReassessInterval: 10 };
  saveState(state,'operator/config',operatorSchema,config);
  createSpawnQueue(state,home).submit({ id: 'unrelated-pipeline',name: 'unrelated-pipeline',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/remote-pipeline',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
function controls(memory: PipelineMemory): void {
  if (![200,260,470].includes(Game.time)) return;
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...config.empire as object,remoteMaximumSlots: Game.time === 260 ? 2 : 0 };
  saveState(state,'operator/config',operatorSchema,config);
  if (Game.time === 470) memory.pipelineStopped = Game.time;
}
function moveSensor(): void {
  const hidden = Game.time >= 200 && Game.time < 330 || Game.time >= 470;
  const target = hidden ? new RoomPosition(43,28,home) : new RoomPosition(10,40,remote);
  Game.creeps['reservation-witness']!.moveTo(target,{ range: 0,reusePath: 10,maxRooms: 3,maxOps: 2000 });
}
function stage(): string {
  if (Game.time < 200) return 'service';
  if (Game.time < 260) return 'withdraw';
  if (Game.time < 330) return 'expired-unseen';
  if (Game.time < 400) return 'observe-hostile';
  return Game.time < 470 ? 'fresh-recovery' : 'final-withdraw';
}
