import { reservationOwner } from '../../src/features/remotes/reservation/identity';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState, peekState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { resolveConfig } from '../../src/config/resolve';
import { nativeRemoteManagementPolicy } from '../../src/app/remotes/management/policy';
import { createNativeReservationCandidates } from '../../src/app/remotes/reservation/candidates';
import { createNativeRemoteManagement } from '../../src/app/remotes/management/native';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { reservationIdentity } from '../../src/features/remotes/reservation/identity';
import { distributorOwner } from '../../src/features/logistics/identity';
import { bodyCost } from '../../src/capabilities/spawning/body';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { taskSchema } from '../../src/persistence/tasks/schema';
import { validRemoteTaskPayload } from '../../src/app/remotes/task';
const state = createMemoryPort(() => Memory), home = 'W0N1', remote = 'E0N1', assignments = createRemoteAssignmentStore(state);
const candidates = createNativeReservationCandidates(state), manager = createNativeRemoteManagement(state,{ maximumRooms: 8,maximumOps: 10000 });
interface Probe extends Memory { reservationPopulationRows?: unknown[]; reservationBirths?: Record<string,number>; reservationBirthAt?: Record<string,number>; reservationRevokedAt?: number }
export function loop(): void { runReservationPopulation('normal'); }
export function runReservationPopulation(mode: 'normal' | 'admission' | 'cancel'): void {
  const memory = Memory as Probe;
  if (Game.time === 1) setup(mode);
  if (mode === 'admission') admissionStage();
  if (mode === 'cancel' && !memory.reservationRevokedAt && Object.values(Game.creeps).some(creep => creep.spawning && reservationIdentity(creep.memory.population?.owner ?? ''))) {
    assignments.reconcile({ home,tick: Game.time,lifetime: 1000,expectedRevision: assignments.read().revision,plans: [] }); memory.reservationRevokedAt = Game.time;
  }
  if (Game.time === 850) { assignments.reconcile({ home,tick: Game.time,lifetime: 1000,expectedRevision: assignments.read().revision,plans: [] }); memory.reservationRevokedAt = Game.time; }
  if (!memory.reservationRevokedAt) {
    const raw = openState(state,'operator/config',operatorSchema), config = resolveConfig({ empire: raw.empire },Game.time).values;
    const base = nativeRemoteManagementPolicy(Game.rooms[home]!,[remote],config)!;
    const policy = candidates(Game.rooms[home]!,base,config,() => true);
    manager.advance({ home,tick: Game.time,policy },{ rooms: 1,sources: 1 },() => true);
  }
  if (mode === 'admission' && Game.time === 2) seedUnfundedBirth();
  const calls: { unit: string; code: number }[] = [], reserve = Creep.prototype.reserveController;
  Creep.prototype.reserveController = function(controller) { const code = reserve.call(this,controller); calls.push({ unit: this.name,code }); return code; };
  try { runtimeLoop(); } finally { Creep.prototype.reserveController = reserve; }
  snapshot(memory,calls);
}
function setup(mode: 'normal' | 'admission' | 'cancel'): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,remoteReservationEnabled: true,
    remoteReservationBodyBudget: 1300,remoteReservationEnergyReserve: mode === 'admission' ? 8000 : 0,remoteReservationMinimumBuffer: 100,remoteReservationQuoteRooms: 1,
    remoteWorkerCpuBudget: 100,remoteCpuBudget: 0,remoteMaximumSlots: 2,remoteMaximumSpawnLoad: 2,remoteMaximumPathOps: 10000,
    remoteReassessInterval: 30,remoteLeaseLifetime: 200,remoteScanLifetime: 50,intelMaximumAge: 200,remoteContainersEnabled: false,
    logisticsEnabled: true,energyRequestsEnabled: true,distributorSpawningEnabled: true,distributorTarget: 1,distributorBodyBudget: 150,
    recoveryEnabled: false,energyBankingEnabled: false,preservationEnabled: false };
  saveState(state,'operator/config',operatorSchema,config);
  createSpawnQueue(state,home).submit({ id: 'unrelated-reservation',name: 'unrelated-reservation',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/reservation-population',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
function snapshot(memory: Probe, calls: { unit: string; code: number }[]): void {
  const births = memory.reservationBirths ??= {}, units = Object.values(Game.creeps).filter(creep => reservationIdentity(creep.memory.population?.owner ?? ''));
  const distributors = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === distributorOwner(home));
  const bornAt = memory.reservationBirthAt ??= {};
  for (const creep of [...units,...distributors]) { births[creep.name] ??= bodyCost(creep.body.map(part => part.type)); bornAt[creep.name] ??= Game.time; }
  const room = Game.rooms[home]!, source = Game.rooms[remote]!.find(FIND_SOURCES)[0]!;
  const cargo = Object.values(Game.creeps).reduce((sum,creep) => sum+creep.store.energy,0);
  const quote = createRemoteManagementStore(state,home).read().offers[0]?.reservation?.quote;
  const price = quote ? { ...quote.economics.timing,cost: quote.body.cost,claims: quote.economics.claims,quoteObservedAt: quote.observedAt } : null;
  const definitions = { reserve: { phases: ['work'],validPayload: validRemoteTaskPayload } };
  (memory.reservationPopulationRows ??= []).push({ tick: Game.time,revokedAt: memory.reservationRevokedAt ?? null,calls,price,
    reservation: Game.rooms[remote]!.controller!.reservation ?? null,source: { energy: source.energy,capacity: source.energyCapacity,regeneration: source.ticksToRegeneration ?? null },
    spawnEnergy: room.energyAvailable,storage: room.storage!.store.energy,cargo,birthCost: Object.entries(births).reduce((sum,[name,cost]) => sum+(bornAt[name]! < Game.time ? cost : 0),0),
    units: units.map(creep => ({ name: creep.name,owner: creep.memory.population!.owner,room: creep.pos.roomName,spawning: creep.spawning,ttl: creep.ticksToLive ?? null,
      tasks: peekState(state,'tasks/'+creep.name,taskSchema(creep.name,definitions))?.queue.map(task => ({ id: task.id,kind: task.kind })) ?? [] })),
    distributors: distributors.map(creep => ({ name: creep.name,spawning: creep.spawning,cargo: creep.store.energy })),
    pending: createSpawnQueue(state,home).list(),lease: assignments.owner(remote,Game.time) ?? null,sentinel: state.read('fixture/reservation-population') });
}

function admissionStage(): void {
  if (![41,81].includes(Game.time)) return;
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...config.empire as object,remoteReservationEnabled: Game.time === 81,remoteReservationBodyBudget: Game.time === 81 ? 1299 : 1300,remoteReservationEnergyReserve: 0 };
  saveState(state,'operator/config',operatorSchema,config);
}
function seedUnfundedBirth(): void {
  const lease = assignments.owner(remote,Game.time)!;
  createSpawnQueue(state,home).submit({ id: 'stale-unfunded-reserver',name: 'stale-unfunded-reserver',owner: reservationOwner({ home,room: remote,generation: lease.generation }),
    room: home,body: ['claim','claim','move','move'],priority: 50,readyAt: 50,expiresAt: 200 });
}
