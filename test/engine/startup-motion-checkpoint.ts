import { startupInitialMotionInput } from '../fixtures/startup-initial-motion';
import type { StartupDeliveryInput } from '../../src/capabilities/economy/startup/delivery-model';
import { startupMotionInput } from '../fixtures/startup-motion';
import { createStartupProject,restoreStartupProject,forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import type { StatePort,Envelope } from '../../src/persistence/versioned-state';
interface MotionProof { savedAt: number; format: number; tripCount: number; birthCount: number; resumedAt?: number; result?: ReturnType<typeof forecastStartupProject>; uninterrupted?: ReturnType<typeof forecastStartupProject> }
interface MotionMemory extends Memory { startupMotionProof?: MotionProof; startupInitialMotionProof?: MotionProof }
/** Portable model inside a real VM reset; not native physical movement calibration. */
export function snapshotStartupMotionCheckpoint(state: StatePort): void {
  snapshot(state,startupMotionInput(),'fixture/startup-motion','startupMotionProof',43);
  snapshot(state,startupInitialMotionInput(),'fixture/startup-initial-motion','startupInitialMotionProof',2);
}
function snapshot(state: StatePort,input: StartupDeliveryInput,key: string,field: 'startupMotionProof' | 'startupInitialMotionProof',frames: number): void {
  const memory = Memory as MotionMemory;
  if (Game.time === 149) {
    const project = createStartupProject(input); project.advance(frames); const saved = project.checkpoint();
    state.write(key,{ owner: 'fixture',version: 1,data: saved });
    memory[field] = { savedAt: Game.time,format: saved.format,tripCount: saved.motion!.trips.length,birthCount: saved.timeline.births.length }; return;
  }
  const envelope = state.read(key) as Envelope | undefined,proof = memory[field];
  if (!proof || envelope?.owner !== 'fixture' || envelope.version !== 1) throw new Error('Missing motion checkpoint fixture');
  const project = restoreStartupProject(input,envelope.data); project.advance(100);
  Object.assign(proof,{ resumedAt: Game.time,result: project.result(),uninterrupted: forecastStartupProject(input) });
}
