import { observeConfiguredPipeline } from './pipeline-configured';
import type { ConfiguredPipelineMemory } from './pipeline-configured';
import { changePipelineEconomicPolicy } from './pipeline-economic';
import { recordCalibrationFrame } from './pipeline-cohort-calibration';
import type { CalibrationMemory } from './pipeline-cohort-calibration';
import { pipelineServicePolicy } from './pipeline-service-policy';
import { withPipelineServiceProbe } from './pipeline-service-probe';
import { createNativeBot } from '../../src/app/native-bot';
import { runPipeline } from './remote-pipeline-bot';
import { pipelineLaborPlan } from './pipeline-labor-plan';
import { createNativeLaborPublication } from '../../src/app/native-labor/publication';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { bodyCost } from '../../src/capabilities/spawning/body';
import type { LaborProposalSnapshot } from '../../src/capabilities/economy/startup/household/labor/proposal';
interface PipelineLaborMemory extends Memory { pipelineLabor?: { proposal: LaborProposalSnapshot; publishedAt: number; acknowledgedAt?: number; birthCost?: number; activeAt?: number; receipt?: NonNullable<CreepMemory['startupLaborReceipt']>; idleAt?: number; moveCodes: number[] } }
const state = createMemoryPort(() => Memory);
let runtime: ReturnType<typeof createNativeBot> | undefined;
export function loop(): void {
  runtime ??= createNativeBot({ ...((Memory as ConfiguredPipelineMemory).pipelineConfiguredMode ? {} : { remoteBirths: pipelineServicePolicy }),spawnEnergyPolicy: 'spawn-first-range-id-v1' });
  runPipeline(() => withPipelineServiceProbe(runtime!),before,probe);
}
function before(): void {
  changePipelineEconomicPolicy(state);
  const memory = Memory as PipelineLaborMemory, publisher = createNativeLaborPublication(state,'W0N1');
  if (Game.time === 1) {
    const config = openState(state,'operator/config',operatorSchema);
    config.empire = { ...config.empire as object,remoteReservationEnabled: !(Memory as CalibrationMemory).pipelineCalibrationMode,distributorSpawningEnabled: false,workersEnabled: true,workerSpawningEnabled: true,workerBuilderTarget: 1,workerBodyBudget: 200,workerMode: 'builder' };
    saveState(state,'operator/config',operatorSchema,config);
    const plan = pipelineLaborPlan(state), proposal = plan.read().proposal;
    if (publisher.publish(proposal,plan.current,() => true) !== 'published') throw new Error('Pipeline labor publication failed');
    memory.pipelineLabor = { proposal,publishedAt: Game.time,moveCodes: [] };
  }
  if (Game.time === 10) {
    const config = openState(state,'operator/config',operatorSchema);
    config.empire = { ...config.empire as object,distributorSpawningEnabled: true };
    saveState(state,'operator/config',operatorSchema,config);
  }
  observeConfiguredPipeline(state);
  const proof = memory.pipelineLabor!;
  if (publisher.maintain() === 'born') proof.acknowledgedAt = Game.time;
  if (proof.receipt) {
    const config = openState(state,'operator/config',operatorSchema);
    config.empire = { ...config.empire as object,workersEnabled: false,workerSpawningEnabled: false };
    saveState(state,'operator/config',operatorSchema,config);
  }
}
function probe(): Record<string,unknown> {
  recordCalibrationFrame();
  const proof = (Memory as PipelineLaborMemory).pipelineLabor!, worker = Game.creeps[proof.proposal.input.request.name];
  if (worker) {
    proof.birthCost ??= bodyCost(worker.body.map(part => part.type));
    if (!worker.spawning) proof.activeAt ??= Game.time;
    if (worker.memory.startupLaborReceipt) proof.receipt ??= { ...worker.memory.startupLaborReceipt };
    if (proof.receipt && Game.time > proof.receipt.completedAt && !proof.idleAt) {
      if (worker.pos.x === 43 && worker.pos.y === 24) proof.idleAt = Game.time;
      else proof.moveCodes.push(worker.moveTo(43,24));
    }
  }
  return { labor: { birthCost: proof.birthCost ?? 0,spent: proof.receipt?.spent ?? 0,cargo: worker?.store.energy ?? 0,position: worker ? [worker.pos.x,worker.pos.y] : null,receipt: proof.receipt ?? null,idleAt: proof.idleAt ?? null } };
}
