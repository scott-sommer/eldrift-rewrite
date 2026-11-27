import { startupMotionInput } from '../fixtures/startup-motion';
import { createStartupProject,restoreStartupProject,forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import type { StatePort,Envelope } from '../../src/persistence/versioned-state';
interface MotionProof { savedAt: number; format: number; tripCount: number; resumedAt?: number; result?: ReturnType<typeof forecastStartupProject>; uninterrupted?: ReturnType<typeof forecastStartupProject> }
interface MotionMemory extends Memory { startupMotionProof?: MotionProof }
/** Portable model inside a real VM reset; not native physical movement calibration. */
export function snapshotStartupMotionCheckpoint(state: StatePort): void {
  const input = startupMotionInput(),memory = Memory as MotionMemory;
  if (Game.time === 149) {
    const project = createStartupProject(input); project.advance(43); const saved = project.checkpoint();
    state.write('fixture/startup-motion',{ owner: 'fixture',version: 1,data: saved });
    memory.startupMotionProof = { savedAt: Game.time,format: saved.format,tripCount: saved.motion!.trips.length }; return;
  }
  const envelope = state.read('fixture/startup-motion') as Envelope | undefined,proof = memory.startupMotionProof;
  if (!proof || envelope?.owner !== 'fixture' || envelope.version !== 1) throw new Error('Missing motion checkpoint fixture');
  const project = restoreStartupProject(input,envelope.data); project.advance(100);
  Object.assign(proof,{ resumedAt: Game.time,result: project.result(),uninterrupted: forecastStartupProject(input) });
}
