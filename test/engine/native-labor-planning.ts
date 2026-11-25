import { createLaborTaskStaging } from '../../src/features/work/stage-labor-task';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupCandidateCatalog } from '../../src/features/remotes/startup/candidates/catalog';
import { encodeStartupPlanningInput, decodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import type { StartupDeliveryInput } from '../../src/capabilities/economy/startup/delivery-model';
import type { LaborCandidatePlanningProof } from './native-labor-planning-model';
import type { NativeLaborProof } from './native-labor-model';
export function beginLaborPlanning(input: StartupDeliveryInput, binding: string): LaborCandidatePlanningProof {
  const proof: LaborCandidatePlanningProof = { root: {},input: encodeStartupPlanningInput(input),binding,savedAt: Game.time };
  const planner = createStartupPlanningJob(createMemoryPort(() => proof.root),'W0N1');
  const progress = planner.advance({ ...query(proof),expectedRevision: 0 },13);
  if (progress.status !== 'deferred' || planner.read().job?.checkpoint.tick !== 13) throw new Error('Expected partial funded labor planning');
  return proof;
}
/** Resume only after native global reloads; root is isolated from operational state. */
export function resumeLaborPlanning(labor: NativeLaborProof): void {
  if (!labor.planning || Game.time !== 14) return;
  restoreStagedTask(labor);
  const proof = labor.planning, state = createMemoryPort(() => proof.root), planner = createStartupPlanningJob(state,'W0N1');
  const before = JSON.stringify(Memory.eldrift), saved = planner.read();
  if (saved.job?.checkpoint.tick !== 13 || planner.result(query(proof))) throw new Error('Expected incomplete restored labor planning');
  const progress = planner.advance({ ...query(proof),expectedRevision: saved.revision },12);
  if (progress.status !== 'complete') throw new Error('Expected complete restored labor planning');
  const uninterrupted = forecastStartupProject(decodeStartupPlanningInput(proof.input));
  if (JSON.stringify(progress.result) !== JSON.stringify(uninterrupted)) throw new Error('Restored funded labor forecast differs');
  const policy = { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: 24,maximumHouseholdCapital: 1300 };
  const catalog = createStartupCandidateCatalog(state,'W0N1');
  if (catalog.capture('funded-labor',query(proof),policy,0) !== 'saved') throw new Error('Expected funded labor candidate capture');
  const assessment = catalog.lookup('funded-labor',query(proof),policy);
  if (!assessment || assessment.accepted || !assessment.rejected.includes('delivery')) throw new Error('Home work cannot prove source return');
  proof.resumedAt = Game.time; proof.through = progress.through; proof.assessment = assessment;
  proof.endingEnergy = progress.result.cash.endingEnergy; proof.readOnlyOperational = before === JSON.stringify(Memory.eldrift);
  if (!proof.readOnlyOperational) throw new Error('Labor planning changed operational state');
}
function query(proof: LaborCandidatePlanningProof) {
  return { room: 'E0N1',source: 'finance-only-source',generation: 1,binding: proof.binding,observedAt: proof.savedAt,expiresAt: 26,tick: Game.time,input: decodeStartupPlanningInput(proof.input) };
}

function restoreStagedTask(labor: NativeLaborProof): void {
  const proof = labor.stagedTask;
  if (!proof) throw new Error('Missing staged labor task');
  const before = JSON.stringify(proof.root), task = createLaborTaskStaging(createMemoryPort(() => proof.root)).read(labor.proposal!.input.request.name)?.queue[0];
  if (task || labor.actorResult?.tick !== 12) throw new Error('Completed labor task was not removed after settlement');
  proof.restoredAt = Game.time; proof.readOnly = before === JSON.stringify(proof.root);
  if (!proof.readOnly) throw new Error('Restoring labor obligation changed its owner state');
}
