import { startupHomeHouseholdInput } from '../fixtures/startup-home';
import { createStartupHomeProject } from '../../src/capabilities/economy/startup/home/project';
import type { StatePort,Envelope } from '../../src/persistence/versioned-state';
interface HomeProof { savedAt: number; format: number; through: number; sources: number; trips: number; births: number; householdCargo: number; dueEnergy: number; resumedAt?: number; result?: ReturnType<ReturnType<typeof createStartupHomeProject>['result']>; uninterrupted?: ReturnType<ReturnType<typeof createStartupHomeProject>['result']> }
interface HomeMemory extends Memory { startupHomeProof?: HomeProof }
/** Synthetic joint model serialized across a real VM reset; no actual native joint-route execution. */
export function snapshotStartupHomeCheckpoint(state: StatePort): void {
  const input = startupHomeHouseholdInput(),memory = Memory as HomeMemory,key = 'fixture/startup-home';
  if (Game.time === 149) {
    const project = createStartupHomeProject(input); project.advance(7); const saved = project.checkpoint();
    state.write(key,{ owner: 'fixture',version: 1,data: saved });
    memory.startupHomeProof = { savedAt: Game.time,format: saved.format,through: saved.tick,sources: saved.sources.length,trips: saved.sources.reduce((sum,source) => sum+source.trips.length,0),births: saved.timeline.births.length,householdCargo: saved.household!.redistribution.trips[0]!.cargo,dueEnergy: saved.sources.flatMap(source => source.due).reduce((sum,receipt) => sum+receipt.energy,0) }; return;
  }
  const envelope = state.read(key) as Envelope | undefined,proof = memory.startupHomeProof;
  if (!proof || envelope?.owner !== 'fixture' || envelope.version !== 1) throw new Error('Missing home checkpoint fixture');
  const restored = createStartupHomeProject(input,envelope.data),expected = createStartupHomeProject(input);
  restored.advance(31); expected.advance(31);
  Object.assign(proof,{ resumedAt: Game.time,result: restored.result(),uninterrupted: expected.result() });
}
