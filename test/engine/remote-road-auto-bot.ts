import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState, peekState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteConstructionIdentity } from '../../src/features/remotes/infrastructure/worker-identity';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { validRemoteTaskPayload } from '../../src/app/remotes/task';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { bodyCost } from '../../src/capabilities/spawning/body';
import { traceReceipts } from './receipt-trace';
const state = createMemoryPort(() => Memory), home = 'W0N1', remote = 'E0N1', assignments = createRemoteAssignmentStore(state);
const definitions = { 'remote-work': { phases: ['work'],validPayload: validRemoteTaskPayload },haul: { phases: ['work'],validPayload: validHaulingPayload } };
interface Probe extends Memory { autoRoadRows?: unknown[]; autoRoadRevoked?: number; autoRoadRefunds?: Record<string,number>; autoRoadBindings?: Record<string,string>; autoRoadBirths?: Record<string,number> }
export function loop(): void { runRoadProbe('normal'); }
export function runRoadProbe(mode: 'normal' | 'admission'): void {
  const memory = Memory as Probe;
  if (Game.time === 1) setup(mode);
  if (mode === 'admission' && [60,120].includes(Game.time)) updateAdmission(Game.time === 60);
  const units = builders(), roads = observedRoads();
  if (mode === 'normal' && !memory.autoRoadRevoked && roads.some(road => road.pos.roomName === remote && road.pos.x <= 2)
    && units.some(creep => !creep.spawning && creep.pos.roomName === remote && creep.store.energy > 0)) {
    assignments.reconcile({ home,tick: Game.time,lifetime: 1000,expectedRevision: assignments.read().revision,plans: [] }); memory.autoRoadRevoked = Game.time;
  }
  runtimeLoop(); snapshot(memory);
}
function setup(mode: 'normal' | 'admission'): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,remoteRoadsEnabled: true,remoteContainersEnabled: false,
    remoteConstructionWorkersEnabled: true,remoteConstructionMaximumWorkers: 1,remoteConstructionBodyBudget: 300,remoteConstructionEnergyReserve: mode === 'admission' ? 2500 : 0,
    remoteWorkerCpuBudget: 100,remoteCpuBudget: 0,remoteMaximumSlots: 1,remoteScanRooms: 1,remoteScanSources: 1,
    constructionEnabled: true,constructionCpuBudget: 100,constructionEntries: 20,constructionAttempts: 10,constructionRoomSites: 80,intelMaximumAge: 1000 };
  saveState(state,'operator/config',operatorSchema,config);
  assignments.reconcile({ home,tick: 1,lifetime: 1000,expectedRevision: 0,plans: [{ room: remote,sources: [Game.rooms[remote]!.find(FIND_SOURCES)[0]!.id],reserve: null,infrastructure: { roads: true,containers: false } }] });
  createSpawnQueue(state,home).submit({ id: 'unrelated-auto-road',name: 'unrelated-auto-road',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/auto-road',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
function builders(): Creep[] { return Object.values(Game.creeps).filter(creep => remoteConstructionIdentity(creep.memory.population?.owner ?? '')); }
function observedRoads(): Structure[] { return Object.values(Game.rooms).flatMap(room => room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_ROAD)); }
function snapshot(memory: Probe): void {
  const units = builders(), costs = memory.autoRoadBirths ??= {};
  for (const creep of units) costs[creep.name] ??= bodyCost(creep.body.map(part => part.type));
  traceReceipts(peekState(state,'logistics-requests/'+home,logisticsQueueSchema)?.records ?? [],{ amounts: memory.autoRoadRefunds ??= {},bindings: memory.autoRoadBindings ??= {} });
  const sites = Object.values(Game.constructionSites).filter(site => site.structureType === STRUCTURE_ROAD);
  (memory.autoRoadRows ??= []).push({ tick: Game.time,revoked: memory.autoRoadRevoked ?? null,storage: Game.rooms[home]!.storage!.store.energy,
    spawnEnergy: Game.rooms[home]!.energyAvailable,birthCost: Object.values(costs).reduce((sum,n) => sum+n,0),
    cargo: units.reduce((sum,creep) => sum+creep.store.energy,0),units: units.map(creep => ({ name: creep.name,id: creep.id ?? null,room: creep.pos.roomName,cargo: creep.store.energy,spawning: creep.spawning,
      tasks: peekState(state,'tasks/'+creep.name,taskSchema(creep.name,definitions))?.queue.map(task => task.kind) ?? [] })),
    roads: observedRoads().map(road => ({ room: road.pos.roomName,x: road.pos.x,y: road.pos.y })),progress: sites.reduce((sum,site) => sum+site.progress,0),
    refunded: Object.values(memory.autoRoadRefunds!).reduce((sum,n) => sum+n,0),claims: peekState(state,'quantity-reservations/empire',quantitySchema)?.claims.length ?? 0,
    pending: createSpawnQueue(state,home).list(),sentinel: state.read('fixture/auto-road') });
}

function updateAdmission(disabled: boolean): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...config.empire as object,remoteConstructionWorkersEnabled: !disabled,remoteConstructionEnergyReserve: 0,remoteConstructionBodyBudget: disabled ? 300 : 299 };
  saveState(state,'operator/config',operatorSchema,config);
}
