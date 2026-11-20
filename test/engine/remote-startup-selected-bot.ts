import { snapshotNativeIncumbent } from './startup-native-incumbents';
import { beginNativeProjection, resumeNativeProjection } from './startup-native-projection';
import { createRemoteFleetStore } from '../../src/features/remotes/fleet/store';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { createNativeBot } from '../../src/app/native-bot';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupSelections } from '../../src/features/remotes/startup/selection-store';
import type { RemoteFleetBirthPolicy } from '../../src/app/remotes/startup/model';
import type { StartupTravelPlan } from '../../src/features/remotes/startup/travel-model';
import { snapshotStartupNativeTravel } from './startup-native-travel';
import { runStartup } from './remote-startup-bot';
interface Selection { generation: number; tick: number; identity: string; plan: StartupTravelPlan }
interface SelectionMemory extends Memory {
  selectedStartup?: Selection; selectedReady?: { tick: number; x: number; y: number; room: string };
  selectedAttempts?: { tick: number; status: string; legs: number }[];
  selectedChecks?: { tick: number; available: boolean; revision: number; count: number; readOnly: boolean }[];
}
const state = createMemoryPort(() => Memory), binding = 'fixture-fixed-service-v1';
/** Native fixture supplies geometry policy; persistence and invalidation use the production owner. */
export function createSelectedStartupLoop(expiring = false) {
  const policy: RemoteFleetBirthPolicy = {
    prepare(profile,config,guard) {
      const current = policy.current(profile,config); if (current) return current;
      if (expiring && Game.time > 29) return null;
      const site = Game.rooms[profile.room]?.find(FIND_MY_CONSTRUCTION_SITES).find(site => site.structureType === STRUCTURE_CONTAINER);
      if (!site || !guard()) return null;
      const quote = snapshotStartupNativeTravel(state,profile.home,2,guard).result, memory = Memory as SelectionMemory;
      (memory.selectedAttempts ??= []).push({ tick: Game.time,status: quote.status,legs: quote.status === 'complete' ? quote.legs.length : quote.completedLegs });
      if (quote.status !== 'complete' || !guard()) return null;
      if (!expiring) beginNativeProjection(state,quote);
      const store = createStartupSelections(state,profile.home);
      if (!store.publish(store.read().revision,Game.time,{ generation: profile.generation,binding,expiresAt: expiring ? 29 : Game.time+10000,quote })) return null;
      memory.selectedStartup = { generation: profile.generation,tick: Game.time,identity: quote.identity,plan: quote.plan };
      return policy.current(profile,config);
    },
    current(profile) {
      const selection = createStartupSelections(state,profile.home).lookup(profile,binding,Game.time);
      return selection ? { spawn: selection.quote.plan.spawn.id,exit: { ...selection.quote.plan.spawn.exit } } : null;
    },
  };
  const runtime = createNativeBot({ remoteBirths: policy });
  return () => {
    runStartup(expiring ? 'selection-expiry' : 'selected',runtime);
    const memory = Memory as SelectionMemory;
    const miner = Object.values(Game.creeps).find(creep => !creep.spawning && remoteFleetIdentity(creep.memory.population?.owner ?? '')?.kind === 'miner');
    if (miner && !memory.selectedReady) memory.selectedReady = { tick: Game.time,x: miner.pos.x,y: miner.pos.y,room: miner.pos.roomName };
    if ([30,46,81,150].includes(Game.time)) { recordSelectionCheck(memory); if (!expiring) resumeNativeProjection(state); }
    if (!expiring && [80,81].includes(Game.time)) snapshotNativeIncumbent(state);
  };
}
function recordSelectionCheck(memory: SelectionMemory): void {
  const store = createStartupSelections(state,'W0N1'), before = JSON.stringify(Memory.eldrift), record = store.read();
  const profile = createRemoteFleetStore(state,'W0N1').read().actors.find(actor => actor.kind === 'miner');
  const available = !!profile && !!store.lookup(profile,binding,Game.time);
  (memory.selectedChecks ??= []).push({ tick: Game.time,available,revision: record.revision,count: record.selections.length,readOnly: before === JSON.stringify(Memory.eldrift) });
}
export const loop = createSelectedStartupLoop();
