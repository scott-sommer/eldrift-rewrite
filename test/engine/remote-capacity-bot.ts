import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createRemoteCapacityStore } from '../../src/features/remotes/capacity/store';
import { createSpawnLoadStore } from '../../src/features/population/spawn-load/store';
type Mode = 'idle' | 'starved' | 'busy' | 'off';
interface Probe extends Memory { capacityRows?: unknown[]; capacityCalls?: unknown[] }
const state = createMemoryPort(() => Memory), home = 'W0N1';
export function runCapacity(mode: Mode): void {
  const memory = Memory as Probe;
  if (Game.time === 1) setup(mode);
  const original = StructureSpawn.prototype.spawnCreep;
  StructureSpawn.prototype.spawnCreep = function(body,name,options) {
    const code = original.call(this,body,name,options);
    (memory.capacityCalls ??= []).push({ tick: Game.time,name,code }); return code;
  };
  try { runtimeLoop(); } finally { StructureSpawn.prototype.spawnCreep = original; }
  const record = mode === 'off' ? null : createRemoteCapacityStore(state,home).read();
  const report = mode === 'off' ? null : createSpawnLoadStore(state,home).report(Game.time,1);
  (memory.capacityRows ??= []).push({ tick: Game.time,supported: record?.supported ?? null,evaluatedAt: record?.evaluatedAt ?? null,
    observedLoad: record?.observedLoad ?? null,load: report?.load ?? null,coverage: report?.coverage ?? null,
    busy: report?.busyTicks ?? null,starved: report?.starvedTicks ?? null,energy: Game.rooms[home]!.energyAvailable,
    segments: mode === 'off' ? null : createSpawnLoadStore(state,home).read().segments.length,
    names: Object.keys(Game.creeps),pending: createSpawnQueue(state,home).list().map(request => request.id) });
}
function setup(mode: Mode): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { remoteAdaptiveEnabled: mode !== 'off',remoteManagementEnabled: true,remoteCpuBudget: 0,
    logisticsEnabled: true,recoveryEnabled: false,energyBankingEnabled: false,preservationEnabled: false };
  saveState(state,'operator/config',operatorSchema,config);
  const queue = createSpawnQueue(state,home);
  queue.submit({ id: 'unrelated-capacity',owner: 'unrelated',room: home,name: 'unrelated-capacity',body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  if (mode !== 'idle') queue.submit({ id: 'pressure',owner: 'fixture-pressure',room: home,name: 'pressure',body: ['claim','claim','move','move'],priority: 1,readyAt: 1,expiresAt: 5000 });
  state.write('fixture/capacity',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
