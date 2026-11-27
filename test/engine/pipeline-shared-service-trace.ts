import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import type { ConfiguredPipelineMemory } from './pipeline-configured';
interface ServiceCall { name: string; action: string; target: string; code: number; amount?: number }
let clock = -1;
let calls: ServiceCall[] = [];
function enabled(): boolean {
  return (Memory as ConfiguredPipelineMemory).pipelineConfiguredVariant === 'shared' && Game.time >= 120 && Game.time <= 210;
}
function currentCalls(): ServiceCall[] {
  if (clock !== Game.time) { clock = Game.time; calls = []; }
  return calls;
}
/** Passive SDK outcomes, including refusals; never issues or replaces an intent. */
export function recordSharedServiceCall(creep: Creep,action: string,target: string,code: number,amount?: number): void {
  if (!enabled() || !remoteFleetIdentity(creep.memory.population?.owner ?? '')) return;
  const rows = currentCalls();
  if (rows.length < 32) rows.push({ name: creep.name,action,target,code,...(amount === undefined ? {} : { amount }) });
}
/** Snapshot all occupants so unrelated traffic at a shared port remains visible. */
export function observeSharedService(): Record<string,unknown> | undefined {
  if (!enabled()) return undefined;
  return { tick: Game.time,calls: [...currentCalls()],units: Object.values(Game.creeps).slice(0,32).map(creep => ({
    name: creep.name,owner: creep.memory.population?.owner ?? null,position: [creep.pos.roomName,creep.pos.x,creep.pos.y],
    energy: creep.store.energy,fatigue: creep.fatigue,spawning: creep.spawning,
  })) };
}
