import { snapshotStartupNativeTravel } from './startup-native-travel';
import { snapshotStartupNativeFacts } from './startup-native-facts';
import type { StartupFactsResult } from '../../src/app/remotes/startup/facts-model';
import { observeStartupAttrition, instrumentStartupCollections } from './startup-attrition';
import type { StartupAttrition } from './startup-attrition';
import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { pipelineScenarioConfig } from './remote-pipeline-config';
import { snapshotPipeline, pipelineIncome, pipelineFamily } from './remote-pipeline-probe';
import type { PipelineMemory } from './remote-pipeline-probe';
interface StartupMemory extends PipelineMemory {
  startupAttrition?: StartupAttrition; startupFacts?: StartupFactsResult; startupTravel?: ReturnType<typeof snapshotStartupNativeTravel>[];
  startupConstruction?: number; startupSites?: Record<string,{ progress: number; total: number; complete: boolean }>;
  startupCalls?: { tick: number; name: string; family: string; code: number }[]; startupStaleAt?: number;
}
type StartupMode = 'staged' | 'refusal' | 'admission';
const state = createMemoryPort(() => Memory), home = 'W0N1';
export function runStartup(mode: StartupMode): void {
  const memory = Memory as StartupMemory;
  if (Game.time === 1) setup(mode);
  if (mode === 'refusal') refusalStage(memory);
  if (mode === 'staged') considerWithdrawal(memory);
  if (mode === 'admission' && [149,150].includes(Game.time)) (memory.startupTravel ??= []).push(snapshotStartupNativeTravel(state,home));
  if (mode === 'admission' && Game.time === 150) memory.startupFacts = snapshotStartupNativeFacts(state,home);
  const attrition = memory.startupAttrition = observeStartupAttrition(memory.startupAttrition), restoreCollections = instrumentStartupCollections(attrition);
  const original = StructureSpawn.prototype.spawnCreep;
  StructureSpawn.prototype.spawnCreep = function(body,name,options) {
    const code = original.call(this,body,name,options), family = pipelineFamily(options?.memory?.population?.owner ?? '');
    (memory.startupCalls ??= []).push({ tick: Game.time,name,family: family ?? 'other',code }); return code;
  };
  try { runtimeLoop(); } finally { StructureSpawn.prototype.spawnCreep = original; restoreCollections(); }
  measureConstruction(memory);
  memory.pipelineRows = [];
  const sites = Object.values(memory.startupSites ?? {});
  snapshotPipeline(state,memory,{ construction: memory.startupConstruction ?? 0,sites,staleAt: memory.startupStaleAt ?? null,localExpiryEnergy: attrition.localExpiryEnergy,inactiveEnergy: attrition.inactiveEnergy,recoveredAttempts: attrition.recoveredAttempts });
}
function setup(mode: StartupMode): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...pipelineScenarioConfig(),remoteStartupPolicy: 'staged',remoteStartupEnergyReserve: mode === 'refusal' ? 10000 : 350,
    remoteContainersEnabled: true,remoteRoadsEnabled: false,constructionEnabled: true,constructionCpuBudget: 100 };
  saveState(state,'operator/config',operatorSchema,config);
  createSpawnQueue(state,home).submit({ id: 'unrelated-pipeline',name: 'unrelated-pipeline',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/remote-pipeline',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
function refusalStage(memory: StartupMemory): void {
  if (Game.time !== 50 && Game.time !== 51) return;
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...config.empire as object,remoteWorkerCpuBudget: Game.time === 50 ? 0 : 100 }; saveState(state,'operator/config',operatorSchema,config);
  if (Game.time !== 50) return;
  const miner = createRemoteFleetStore(state,home).read().actors.find(profile => profile.kind === 'miner');
  if (!miner) throw new Error('Refusal fixture needs an ordinary published miner profile');
  createSpawnQueue(state,home).submit({ id: 'stale-startup',name: 'stale-startup',owner: miner.owner,room: home,body: miner.body,priority: 1,readyAt: 50,expiresAt: 90 });
  memory.startupStaleAt = 50;
}
function considerWithdrawal(memory: StartupMemory): void {
  if (memory.pipelineStopped || Game.time < 4000) return;
  const births = Object.values(memory.pipelineBirths ?? {}).reduce((sum,birth) => sum+birth.cost,0);
  const recovered = pipelineIncome(memory)-births-(memory.startupConstruction ?? 0)-(memory.startupAttrition?.localExpiryEnergy ?? 0) >= 500;
  const loaded = Object.values(Game.creeps).some(creep => pipelineFamily(creep.memory.population?.owner ?? '') === 'courier' && creep.room.name === 'E0N1' && creep.store.energy > 0);
  if ((recovered && loaded && !Object.values(Game.spawns).some(spawn => spawn.spawning)) || Game.time === 4700) {
    const config = openState(state,'operator/config',operatorSchema); config.empire = { ...config.empire as object,remoteMaximumSlots: 0 };
    saveState(state,'operator/config',operatorSchema,config); memory.pipelineStopped = Game.time;
  }
}
function measureConstruction(memory: StartupMemory): void {
  const room = Game.rooms.E0N1; if (!room) return;
  const known = memory.startupSites ??= {}, key = (x: number,y: number) => JSON.stringify([x,y]);
  for (const site of room.find(FIND_MY_CONSTRUCTION_SITES).filter(site => site.structureType === STRUCTURE_CONTAINER)) {
    const item = known[key(site.pos.x,site.pos.y)] ??= { progress: 0,total: site.progressTotal,complete: false };
    memory.startupConstruction = (memory.startupConstruction ?? 0)+Math.max(0,site.progress-item.progress); item.progress = site.progress;
  }
  for (const container of room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_CONTAINER)) {
    const item = known[key(container.pos.x,container.pos.y)]; if (!item || item.complete) continue;
    memory.startupConstruction = (memory.startupConstruction ?? 0)+item.total-item.progress; item.progress = item.total; item.complete = true;
  }
}
