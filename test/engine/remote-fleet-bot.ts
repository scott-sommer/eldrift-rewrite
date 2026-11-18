import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState, peekState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { validRemoteTaskPayload } from '../../src/app/remotes/task';
import { validHaulingPayload } from '../../src/app/hauling-task';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { quantitySchema } from '../../src/persistence/quantities/schema';
import { reservationSchema } from '../../src/persistence/reservations/schema';
import { bodyCost } from '../../src/capabilities/spawning/body';
import { stateKey } from '../../src/persistence/state-key';
import { traceReceipts } from './receipt-trace';
const state = createMemoryPort(() => Memory), home = 'W0N1';
const definitions = { 'remote-mine': { phases: ['work'],validPayload: validRemoteTaskPayload },haul: { phases: ['work'],validPayload: validHaulingPayload } };
interface ProbeMemory extends Memory {
  remoteFleetRows?: unknown[]; remoteFleetRevokedAt?: number; remoteFleetCancel?: { tick: number; name: string }; remoteFleetResumeAt?: number;
  remoteFleetReceipts?: Record<string,number>; remoteFleetBindings?: Record<string,string>; remoteFleetBirthCosts?: Record<string,number>;
}
export function loop(): void { runFleetProbe('normal'); }
export function runFleetProbe(mode: 'normal' | 'cancel' | 'replacement' | 'damage' | 'budget' | 'bootstrap'): void {
  const memory = Memory as ProbeMemory;
  if (Game.time === 1) {
    const config = openState(state,'operator/config',operatorSchema);
    config.empire = { remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,remoteDepth: 1,remoteMaximumSlots: 1,
      remoteMaximumSpawnLoad: 2,remoteCpuBudget: 100,remoteWorkerCpuBudget: mode === 'budget' ? 5 : 100,remoteContainersEnabled: mode === 'bootstrap',constructionEnabled: mode === 'bootstrap',constructionCpuBudget: 100,remoteMinimumRcl: 2 };
    saveState(state,'operator/config',operatorSchema,config);
    createSpawnQueue(state,home).submit({ id: 'unrelated-request',name: 'unrelated-request',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
    state.write('sentinel/remote-fleet',{ owner: 'fixture',version: 1,data: { kept: ['fleet',29] } });
  }
  updatePolicy(memory,mode);
  runtimeLoop(); snapshot(memory,mode);
}
function updatePolicy(memory: ProbeMemory, mode: string): void {
  const units = Object.values(Game.creeps).filter(creep => remoteFleetIdentity(creep.memory.population?.owner ?? ''));
  if (mode === 'cancel' && !memory.remoteFleetCancel) {
    const spawning = units.find(creep => creep.spawning && typeof creep.id === 'string');
    if (spawning) { patch({ remoteSpawningEnabled: false }); memory.remoteFleetCancel = { tick: Game.time,name: spawning.name }; }
  }
  if (memory.remoteFleetCancel && !memory.remoteFleetResumeAt && Game.time >= memory.remoteFleetCancel.tick+6) {
    patch({ remoteSpawningEnabled: true }); memory.remoteFleetResumeAt = Game.time;
  }
  const credited = Object.values(memory.remoteFleetReceipts ?? {}).reduce((sum,amount) => sum+amount,0);
  if (!memory.remoteFleetRevokedAt && Game.time >= (mode === 'bootstrap' ? 1300 : 180) && credited >= 200 && units.some(creep => remoteFleetIdentity(creep.memory.population!.owner)?.kind === 'courier'
    && creep.pos.roomName === 'E0N1' && creep.store.energy > 0)) {
    patch({ remoteMaximumSlots: 0 }); memory.remoteFleetRevokedAt = Game.time;
  }
}
function patch(values: object): void {
  const config = openState(state,'operator/config',operatorSchema); config.empire = { ...config.empire as object,...values }; saveState(state,'operator/config',operatorSchema,config);
}
function snapshot(memory: ProbeMemory, mode: string): void {
  const records = peekState(state,stateKey('logistics-requests',home),logisticsQueueSchema)?.records ?? [];
  const amounts = memory.remoteFleetReceipts ??= {}, bindings = memory.remoteFleetBindings ??= {}, costs = memory.remoteFleetBirthCosts ??= {};
  traceReceipts(records,{ amounts,bindings });
  const units = Object.values(Game.creeps).filter(creep => typeof creep.id === 'string' && remoteFleetIdentity(creep.memory.population?.owner ?? ''));
  for (const creep of units) costs[creep.id] ??= bodyCost(creep.body.map(part => part.type));
  const stores = Game.rooms[home]!.find(FIND_STRUCTURES).filter(item => 'store' in item) as AnyStoreStructure[];
  const room = Game.rooms.E0N1, source = room?.find(FIND_SOURCES)[0];
  const container = room?.find(FIND_STRUCTURES).find(item => item.structureType === STRUCTURE_CONTAINER) as StructureContainer | undefined;
  (memory.remoteFleetRows ??= []).push({ tick: Game.time,revokedAt: memory.remoteFleetRevokedAt ?? null,cancelled: memory.remoteFleetCancel ?? null,
    credited: Object.values(amounts).reduce((sum,amount) => sum+amount,0),birthCost: Object.values(costs).reduce((sum,cost) => sum+cost,0),
    spawnEnergy: Game.rooms[home]!.energyAvailable,storageEnergy: Game.rooms[home]!.storage?.store.energy ?? 0,
    homeTotal: stores.reduce((sum,item) => sum+item.store.energy,0),sourceEnergy: source?.energy ?? null,containerEnergy: container?.store.energy ?? null,
    ...(mode === 'bootstrap' ? {} : { fleet: createRemoteFleetStore(state,home).read() }),pending: createSpawnQueue(state,home).list(),sentinel: state.read('sentinel/remote-fleet'),
    sites: Object.values(Game.constructionSites).filter(site => site.pos.roomName === 'E0N1').map(site => ({ id: site.id,type: site.structureType,x: site.pos.x,y: site.pos.y,progress: site.progress,total: site.progressTotal })),
    quantities: peekState(state,'quantity-reservations/empire',quantitySchema)?.claims.length ?? 0,miningClaims: peekState(state,'reservations/empire',reservationSchema)?.claims.length ?? 0,
    units: units.map(creep => {
      const key = stateKey('logistics-attempts',creep.id), journal = state.read(key) === undefined ? undefined : createTransferJournal(state,creep.id).read();
      return { id: creep.id,name: creep.name,kind: remoteFleetIdentity(creep.memory.population!.owner)!.kind,room: creep.pos.roomName,cargo: creep.store.getUsedCapacity(),
        spawning: creep.spawning,moves: creep.getActiveBodyparts(MOVE),ttl: creep.ticksToLive ?? null,tasks: peekState(state,stateKey('tasks',creep.name),taskSchema(creep.name,definitions))?.queue.map(task => task.kind) ?? [],
        journal: journal?.attempt ? { ...journal.attempt,acknowledged: journal.acknowledged,result: journal.result } : null };
    }) });
}
