import { createNativeStartupProjection } from '../../src/app/remotes/startup/projection/native';
import { createStartupProject, restoreStartupProject, forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { encodeStartupPlanningInput, decodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import type { StartupPlanningInput } from '../../src/features/remotes/startup/planning/model';
import type { StartupProjectCheckpoint } from '../../src/capabilities/economy/startup/checkpoints/project-model';
import type { StatePort, Envelope } from '../../src/persistence/versioned-state';
import { snapshotStartupNativeTravel } from './startup-native-travel';
import { nativeProjectionOptions } from './startup-native-projection';
interface IncumbentMemory extends Memory { incumbentProjection?: Record<string,unknown> }
/** Real current worker/cargo, evaluated as a finite continuation rather than a staged future workforce policy. */
export function snapshotNativeIncumbent(state: StatePort): void {
  const memory = Memory as IncumbentMemory;
  if (Game.time === 80) {
    const quote = snapshotStartupNativeTravel(state,'W0N1',5).result; if (quote.status !== 'complete') throw new Error('Expected current incumbent quote');
    const options = nativeProjectionOptions(quote); options.births = [];
    const projection = createNativeStartupProjection(state)(quote,options);
    if (projection.status !== 'ready' || !projection.input.initial?.miner) throw new Error('Expected observed native station miner import');
    const project = createStartupProject(projection.input); project.advance(10); const checkpoint = project.checkpoint();
    state.write('fixture/incumbent-project',{ owner: 'fixture',version: 1,data: { input: encodeStartupPlanningInput(projection.input),checkpoint } });
    memory.incumbentProjection = { observedAt: Game.time,worker: quote.facts.workers[0],initial: projection.input.initial,source: projection.input.project.source,
      remainingWork: projection.input.project.remainingProgress,checkpointTick: checkpoint.tick,checkpointFormat: checkpoint.format,openingBefore: checkpoint.opening };
    return;
  }
  const envelope = state.read('fixture/incumbent-project') as Envelope, data = envelope.data as { input: StartupPlanningInput; checkpoint: StartupProjectCheckpoint };
  const input = decodeStartupPlanningInput(data.input), project = restoreStartupProject(input,data.checkpoint), before = JSON.stringify(Memory.eldrift);
  const proof = memory.incumbentProjection; if (!proof) throw new Error('Missing native incumbent reset proof');
  Object.assign(proof,{ resumedAt: Game.time,recoveredThrough: project.advance(0).through,openingAfter: project.checkpoint().opening });
  project.advance(input.project.spawning.cash.horizon+1);
  Object.assign(proof,{ result: project.result(),uninterrupted: forecastStartupProject(input),readOnly: before === JSON.stringify(Memory.eldrift) });
}
