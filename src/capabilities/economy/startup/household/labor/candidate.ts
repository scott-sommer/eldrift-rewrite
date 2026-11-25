import { laborFulfilled } from './fulfillment';
import type { HouseholdLaborState } from './model';
import { copyPlain } from '../../../../../core/plain-data';
import { copySpawnRequest, sameSpawnRequest } from '../../../../spawning/placement';
import { snapshotStartupProject } from '../../snapshot';
import { createStartupProject, restoreStartupProject } from '../../project';
import { StartupCheckpointCapacityError } from '../../checkpoints/capacity';
import { laborIdentity, natural } from './validation';
import type { StartupProjectCheckpoint } from '../../checkpoints/project-model';
import type { LaborCandidateSeed } from './candidate-model';
import type { createLaborProposal } from './proposal';
/** Bounded financial birth preview, then task/route proposal; no native enqueue or expense is emitted. */
export function createLaborCandidate(propose: ReturnType<typeof createLaborProposal>) {
  return (seed: LaborCandidateSeed, maximumFrames: number, checkpoint?: StartupProjectCheckpoint, guard: () => boolean = () => true) => {
    if (!natural(maximumFrames) || maximumFrames > 10001) throw new Error('Invalid labor preview budget');
    if (!guard()) return deferred('admission',0);
    const input = snapshotStartupProject(seed.base), request = copyPlain(seed.proposal), reason = contextRefusal(input,seed);
    if (reason) return deferred(reason,0);
    const existing = input.project.spawning.requests.find(item => item.id === request.request.id);
    if (existing && !sameSpawnRequest(existing,request.request)) return deferred('request-conflict',0);
    if (!existing) input.project.spawning.requests = [...input.project.spawning.requests,copySpawnRequest(request.request)];
    const preview = previewBirth(input,request.request.id,maximumFrames,checkpoint,guard), birth = preview.birth;
    if (!birth) return { ...deferred(preview.reason,preview.frames),checkpoint: preview.checkpoint! };
    const proposal = propose({ ...request,birth },guard); if (proposal.status !== 'ready') return { ...proposal,previewFrames: preview.frames };
    return attach(input,proposal,preview.frames);
  };
}
function attach(input: LaborCandidateSeed['base'], proposal: Extract<ReturnType<ReturnType<typeof createLaborProposal>>,{ status: 'ready' }>, previewFrames: number) {
  const snapshot = proposal.read(), household = input.household!, previous = household.labor?.jobs ?? [];
  if (household.endpointEnergy > snapshot.facts.source.availableEnergy || input.homeSink.capacity !== snapshot.facts.source.capacity) return deferred('endpoint-snapshot',previewFrames);
  if (input.homeSink.freeCapacity > Math.max(0,snapshot.facts.source.freeCapacity-snapshot.facts.source.claimedCapacity)) return deferred('sink-liabilities',previewFrames);
  const same = previous.find(job => job.id === snapshot.job.id), horizon = snapshot.input.policy.horizon;
  if (same && laborIdentity({ horizon,jobs: [same] }) !== laborIdentity({ horizon,jobs: [snapshot.job] })) return deferred('job-conflict',previewFrames);
  household.endpointCapacity = input.homeSink.capacity;
  household.labor = { horizon,jobs: same ? previous : [...previous,snapshot.job] };
  createStartupProject(input);
  const binding = JSON.stringify(['paid-labor-candidate-v1',snapshot.input,snapshot.facts,snapshot.route.identity]);
  if (binding.length > 8192) throw new StartupCheckpointCapacityError('Labor candidate binding capacity');
  const read = () => ({ input: snapshotStartupProject(input),proposal: proposal.read(),previewFrames,binding });
  return { status: 'ready' as const,read,current: proposal.current,
    fulfilled(result: ReturnType<ReturnType<typeof createStartupProject>['result']>): boolean {
      return laborFulfilled(result.spawning as { labor?: { jobs: HouseholdLaborState[] } },[snapshot.job]);
    } };
}
function contextRefusal(input: LaborCandidateSeed['base'], seed: LaborCandidateSeed): string | undefined {
  if (!input.household || !input.project.spawning.funding.energyLayout?.regeneration) return 'physical-household';
  if (seed.endpoint !== seed.proposal.source || seed.proposal.request.room !== input.project.spawning.room) return 'endpoint-binding';
  if (seed.proposal.policy.horizon !== input.project.spawning.cash.horizon) return 'horizon';
  return undefined;
}
function deferred(reason: string, previewFrames: number) { return { status: 'deferred' as const,reason,previewFrames }; }

function previewBirth(input: LaborCandidateSeed['base'], request: string, maximumFrames: number, checkpoint: StartupProjectCheckpoint | undefined, guard: () => boolean) {
  const preview = checkpoint ? restoreStartupProject(input,checkpoint) : createStartupProject(input);
  let frames = 0, birth = preview.birth(request), done = false;
  while (!birth && frames < maximumFrames && guard()) {
    const progress = preview.advance(1); frames += progress.frames; birth = preview.birth(request); done = progress.done; if (done) break;
  }
  return { birth,frames,reason: done ? 'birth-unavailable' : frames === maximumFrames ? 'preview-budget' : 'admission',...(birth ? {} : { checkpoint: preview.checkpoint() }) };
}
