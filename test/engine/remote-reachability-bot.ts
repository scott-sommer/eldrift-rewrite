import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createRemoteReachabilityStore } from '../../src/features/remotes/reachability/store';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
type Mode = 'blocked' | 'arrival' | 'withdraw';
interface Probe extends Memory { reachabilityRows?: unknown[]; reachabilitySignature?: string; reachabilityBirths?: Record<string,{ bornAt: number; readyAt?: number }>; reachabilityZeroTicks?: number[] }
const state = createMemoryPort(() => Memory), home = 'W0N1';
export function runReachability(mode: Mode): void {
  const memory = Memory as Probe;
  if (Game.time === 1) setup();
  const config = openState(state,'operator/config',operatorSchema), units = fleet();
  const terminal = units.some(creep => !creep.spawning && creep.ticksToLive === 1 && remoteFleetIdentity(creep.memory.population!.owner)?.kind === 'miner');
  const budget = terminal ? 0 : 100, enabled = mode !== 'withdraw' || Game.time < 100 || Game.time >= 110;
  const values = config.empire as Record<string,unknown>;
  if (values.remoteWorkerCpuBudget !== budget || values.remoteWorkersEnabled !== enabled) {
    config.empire = { ...values,remoteWorkerCpuBudget: budget,remoteWorkersEnabled: enabled }; saveState(state,'operator/config',operatorSchema,config);
  }
  if (terminal) (memory.reachabilityZeroTicks ??= []).push(Game.time);
  runtimeLoop(); snapshot(memory,terminal);
}
function setup(): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { remoteManagementEnabled: true,remoteWorkersEnabled: true,remoteSpawningEnabled: true,remoteDepth: 1,
    remoteBlockedRooms: ['W0N0','W0N2','W1N1'],remoteMaximumSlots: 1,remoteMaximumSpawnLoad: 2,remoteCpuBudget: 100,remoteWorkerCpuBudget: 100,
    backgroundCpuFraction: .9,remoteContainersEnabled: false,remoteReassessInterval: 30,intelMaximumAge: 200,remoteMaximumPathOps: 10000,
    recoveryEnabled: false,energyBankingEnabled: false,preservationEnabled: false };
  saveState(state,'operator/config',operatorSchema,config);
  createSpawnQueue(state,home).submit({ id: 'unrelated-reachability',name: 'unrelated-reachability',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/reachability',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
function fleet(): Creep[] { return Object.values(Game.creeps).filter(creep => !!remoteFleetIdentity(creep.memory.population?.owner ?? '')); }
function snapshot(memory: Probe, terminal: boolean): void {
  const record = createRemoteReachabilityStore(state,home).read(), units = fleet(), births = memory.reachabilityBirths ??= {};
  for (const creep of units) {
    const entry = births[creep.name] ??= { bornAt: Game.time }; if (!creep.spawning) entry.readyAt ??= Game.time;
  }
  const signature = JSON.stringify({ sources: record.sources,blocked: record.blocked,attempts: record.attempts.map(attempt => [attempt.id,attempt.phase]) });
  const pending = createSpawnQueue(state,home).list();
  if (!pending.some(request => request.id === 'unrelated-reachability')) throw new Error('Unrelated reachability request changed');
  if (signature === memory.reachabilitySignature && !terminal && Game.time%500 !== 0 && ![100,110,1550,3100].includes(Game.time)) return;
  memory.reachabilitySignature = signature;
  (memory.reachabilityRows ??= []).push({ tick: Game.time,sources: record.sources,blocked: record.blocked,attempts: record.attempts,
    lease: createRemoteAssignmentStore(state).owner('E0N1',Game.time) ?? null,budget: (openState(state,'operator/config',operatorSchema).empire as Record<string,unknown>).remoteWorkerCpuBudget,
    pending: pending.map(request => ({ id: request.id,owner: request.owner })),
    units: units.map(creep => ({ name: creep.name,kind: remoteFleetIdentity(creep.memory.population!.owner)!.kind,spawning: creep.spawning,ttl: creep.ticksToLive ?? null,room: creep.pos.roomName,x: creep.pos.x,y: creep.pos.y })) });
}
