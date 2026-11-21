import { assessStartupProject, validateStartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import type { StartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import { PlainDataCapacityError } from '../../../../core/plain-data';
import { StartupCheckpointCapacityError } from '../../../../capabilities/economy/startup/checkpoints/capacity';
import { startupProjectIdentity } from '../../../../capabilities/economy/startup/checkpoints/project-identity';
import { createStartupProject, restoreStartupProject } from '../../../../capabilities/economy/startup/project';
import { snapshotStartupProject } from '../../../../capabilities/economy/startup/snapshot';
import type { StatePort } from '../../../../persistence/versioned-state';
import { natural } from '../../assignment-validation';
import { createStartupPlanningStore } from './store';
import { planningContextKey, validPlanningContext } from './validation';
import { decodeStartupPlanningInput, encodeStartupPlanningInput } from './input';
import type { StartupPlanningJob, StartupPlanningQuery, StartupPlanningRequest, StartupPlanningResult } from './model';
/** Frame admission is guarded; callers reserve serialization/publication budget separately. */
export function createStartupPlanningJob(state: StatePort, home: string) {
  const store = createStartupPlanningStore(state,home);
  function advance(request: StartupPlanningRequest, maximumFrames: number, guard: () => boolean = () => true): StartupPlanningResult {
    validateRequest(request,home);
    if (!natural(request.expectedRevision) || !natural(maximumFrames) || maximumFrames > 10001) throw new Error('Invalid startup planning budget/revision');
    if (request.tick > request.expiresAt) return deferred('expired');
    if (!guard()) return deferred('admission');
    const current = store.read();
    if (request.tick < current.clock) return deferred('clock');
    if (request.expectedRevision !== current.revision) return deferred('conflict');
    const candidate = { ...request,input: snapshotStartupProject(request.input) };
    return execute(candidate,current.job,maximumFrames,guard);
  }
  function execute(request: StartupPlanningRequest, previous: StartupPlanningJob | null, maximumFrames: number, guard: () => boolean): StartupPlanningResult {
    const project = prepareProject(request,previous);
    if (!project) return deferred('capacity');
    const progress = project.advance(maximumFrames,guard);
    if (progress.done && progress.frames === 0) return { status: 'complete',frames: 0,through: progress.through,result: project.result() };
    if (progress.frames === 0) return deferred(maximumFrames === 0 ? 'budget' : 'admission');
    const job = snapshotJob(request,project);
    if (!job) return deferred('capacity',progress.frames);
    const saved = store.save(request.expectedRevision,request.tick,job);
    if (saved !== 'saved') return deferred(saved,progress.frames);
    return progress.done ? { status: 'complete',frames: progress.frames,through: progress.through,result: project.result() }
      : deferred(progress.frames === maximumFrames ? 'budget' : 'admission',progress.frames);
  }
  function result(request: StartupPlanningQuery) {
    validateRequest(request,home);
    if (request.tick > request.expiresAt) return undefined;
    const current = store.read();
    if (request.tick < current.clock || !current.job) return undefined;
    try {
      if (!matches(current.job,request,startupProjectIdentity(request.input))) return undefined;
      const project = restoreStartupProject(decodeStartupPlanningInput(current.job.input),current.job.checkpoint);
      return project.advance(0).done ? project.result() : undefined;
    } catch (error) { if (capacityError(error)) return undefined; throw error; }
  }
  function assess(request: StartupPlanningQuery, policy: StartupReturnPolicy) {
    validateStartupReturnPolicy(policy);
    const completed = result(request);
    if (!completed) return undefined;
    const participants = new Set([...request.input.project.workers,...request.input.couriers].map(worker => worker.request));
    const requiredBirths = request.input.project.spawning.requests.filter(birth => participants.has(birth.id)).map(birth => birth.id);
    return assessStartupProject(completed,request.input.project.spawning.cash.horizon,policy,requiredBirths);
  }
  return { read: store.read,advance,result,assess,withdraw: store.withdraw };
}
function validateRequest(request: StartupPlanningQuery, home: string): void {
  if (!natural(request.tick) || !validPlanningContext(request,home,request.tick)) throw new Error('Invalid startup planning context');
  if (request.input.project.spawning.room !== home) throw new Error('Invalid startup planning input home');
}
function matches(job: StartupPlanningJob | null, request: StartupPlanningQuery, identity: string): boolean {
  return !!job && planningContextKey(job) === planningContextKey(request) && job.checkpoint.binding === identity;
}
function jobSnapshot(request: StartupPlanningRequest, checkpoint: StartupPlanningJob['checkpoint']): StartupPlanningJob {
  const { room,source,generation,binding,observedAt,expiresAt } = request;
  return { room,source,generation,binding,observedAt,expiresAt,input: encodeStartupPlanningInput(request.input),checkpoint };
}
function capacityError(error: unknown): boolean { return error instanceof PlainDataCapacityError || error instanceof StartupCheckpointCapacityError; }
function deferred(reason: Extract<StartupPlanningResult,{ status: 'deferred' }>['reason'], frames = 0): StartupPlanningResult { return { status: 'deferred',frames,reason }; }

function prepareProject(request: StartupPlanningRequest, previous: StartupPlanningJob | null) {
  try {
    const identity = startupProjectIdentity(request.input);
    return matches(previous,request,identity) ? restoreStartupProject(request.input,previous!.checkpoint) : createStartupProject(request.input);
  } catch (error) { if (capacityError(error)) return undefined; throw error; }
}
function snapshotJob(request: StartupPlanningRequest, project: ReturnType<typeof createStartupProject>) {
  try { return jobSnapshot(request,project.checkpoint()); }
  catch (error) { if (capacityError(error)) return undefined; throw error; }
}
