import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { createNativeBot } from '../../src/app/native-bot';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { RemoteFleetBirthPolicy } from '../../src/app/remotes/startup/model';
import type { StartupTravelPlan } from '../../src/features/remotes/startup/travel-model';
import { snapshotStartupNativeTravel } from './startup-native-travel';
import { runStartup } from './remote-startup-bot';
interface Selection { generation: number; tick: number; identity: string; plan: StartupTravelPlan }
interface SelectionMemory extends Memory { selectedStartup?: Selection; selectedReady?: { tick: number; x: number; y: number; room: string }; selectedAttempts?: { tick: number; status: string; legs: number }[] }
const state = createMemoryPort(() => Memory);
/** Fixture policy selects measured geometry; it makes no forward economic decision. */
const policy: RemoteFleetBirthPolicy = {
  prepare(profile,_config,guard) {
    if (policy.current(profile,_config)) return policy.current(profile,_config);
    const site = Game.rooms[profile.room]?.find(FIND_MY_CONSTRUCTION_SITES).find(site => site.structureType === STRUCTURE_CONTAINER);
    if (!site || !guard()) return null;
    const quote = snapshotStartupNativeTravel(state,profile.home,2,guard).result;
    const memory = Memory as SelectionMemory;
    (memory.selectedAttempts ??= []).push({ tick: Game.time,status: quote.status,legs: quote.status === 'complete' ? quote.legs.length : quote.completedLegs });
    if (quote.status !== 'complete') return null;
    memory.selectedStartup = { generation: profile.generation,tick: Game.time,identity: quote.identity,plan: quote.plan };
    return policy.current(profile,_config);
  },
  current(profile) {
    const selection = (Memory as SelectionMemory).selectedStartup;
    if (!selection || selection.generation !== profile.generation) return null;
    const plan = selection.plan;
    if (plan.home !== profile.home || plan.room !== profile.room || plan.source !== profile.source) return null;
    if (JSON.stringify(plan[profile.kind]) !== JSON.stringify(profile.body)) return null;
    return { spawn: plan.spawn.id,exit: { ...plan.spawn.exit } };
  },
};
const runtime = createNativeBot({ remoteBirths: policy });
export function loop(): void {
  runStartup('selected',runtime);
  const memory = Memory as SelectionMemory;
  const miner = Object.values(Game.creeps).find(creep => !creep.spawning && remoteFleetIdentity(creep.memory.population?.owner ?? '')?.kind === 'miner');
  if (miner && !memory.selectedReady) memory.selectedReady = { tick: Game.time,x: miner.pos.x,y: miner.pos.y,room: miner.pos.roomName };
}
