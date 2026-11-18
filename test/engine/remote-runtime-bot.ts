import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createRemoteDiscoveryStore } from '../../src/features/remotes/discovery/store';
import { createRemoteManagementStore } from '../../src/features/remotes/management/store';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
const state = createMemoryPort(() => Memory), home = 'W0N1', assignments = createRemoteAssignmentStore(state);
export function loop(): void {
  if (Game.time === 1) {
    const config = openState(state,'operator/config',operatorSchema);
    config.empire = { remoteManagementEnabled: true,remoteMinimumRcl: 2,remoteDiscoveryReads: 1,remoteDiscoveryRefresh: 100,
      remoteScanRooms: 1,remoteScanSources: 1,remoteMaximumSpawnLoad: 2,intelMaximumAge: 100 };
    saveState(state,'operator/config',operatorSchema,config);
    assignments.reconcile({ home,tick: 1,lifetime: 30,expectedRevision: 0,plans: [{ room: 'W0N2',sources: ['manual'],reserve: null,infrastructure: null }] });
    state.write('sentinel/remote-runtime',{ owner: 'fixture',version: 1,data: { kept: ['runtime',29] } });
  }
  updatePolicy();
  runtimeLoop();
  const discovery = createRemoteDiscoveryStore(state,home).read(), management = createRemoteManagementStore(state,home).read();
  const memory = Memory as Memory & { remoteRuntimeRows?: unknown[]; remoteRuntimePhases?: RuntimePhases };
  (memory.remoteRuntimeRows ??= []).push({ tick: Game.time,phases: { ...memory.remoteRuntimePhases },discovery,management,assignments: assignments.read(),sentinel: state.read('sentinel/remote-runtime') });
}
interface RuntimePhases { blockedAt?: number; unblockedAt?: number; zeroAt?: number; restoredAt?: number; disabledAt?: number }
function updatePolicy(): void {
  const memory = Memory as Memory & { remoteRuntimePhases?: RuntimePhases }, phases = memory.remoteRuntimePhases ??= {};
  const changes: Record<number,object> = { 10: { remoteCpuBudget: 0 },16: { remoteCpuBudget: 5 } };
  const selected = !!assignments.owner('E0N1',Game.time);
  if (Game.time >= 20 && !phases.blockedAt && selected) { phases.blockedAt = Game.time; changes[Game.time] = { remoteBlockedRooms: ['E0N1'] }; }
  if (phases.blockedAt && !phases.unblockedAt && Game.time >= phases.blockedAt+8) { phases.unblockedAt = Game.time; changes[Game.time] = { remoteBlockedRooms: [] }; }
  if (ready(phases.unblockedAt,8) && !phases.zeroAt && selected) { phases.zeroAt = Game.time; changes[Game.time] = { remoteMaximumSlots: 0 }; }
  if (ready(phases.zeroAt,8) && !phases.restoredAt) { phases.restoredAt = Game.time; changes[Game.time] = { remoteMaximumSlots: 2 }; }
  if (Game.time >= 55 && ready(phases.restoredAt,7) && !phases.disabledAt && selected) { phases.disabledAt = Game.time; changes[Game.time] = { remoteManagementEnabled: false }; }
  if (!changes[Game.time]) return;
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...config.empire as Record<string,unknown>,...changes[Game.time] }; saveState(state,'operator/config',operatorSchema,config);
}
function ready(tick: number | undefined, wait: number): boolean { return tick !== undefined && Game.time >= tick+wait; }
